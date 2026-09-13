"""
Celery tasks for code analysis (static analysis, linting, complexity)
"""

from celery import Task
from app.celery_app import celery_app
import subprocess
import json
import tempfile
import os
from typing import Dict, List, Any
import time


class AnalysisTask(Task):
    """Base task with error handling and logging"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        print(f"Task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@celery_app.task(base=AnalysisTask, name="app.tasks.analysis_tasks.analyze_python")
def analyze_python(code: str, checks: List[str] = None) -> Dict[str, Any]:
    """
    Run static analysis on Python code (pylint, flake8, complexity)

    Args:
        code: Python code to analyze
        checks: List of checks to run (pylint, flake8, complexity)

    Returns:
        Dictionary with analysis results
    """
    if checks is None:
        checks = ["pylint", "flake8", "complexity"]

    results = {
        "status": "success",
        "checks": {},
        "summary": {
            "total_issues": 0,
            "critical": 0,
            "errors": 0,
            "warnings": 0,
            "info": 0
        }
    }

    # Write code to temporary file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        # Run pylint
        if "pylint" in checks:
            try:
                result = subprocess.run(
                    ["pylint", temp_file, "--output-format=json"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                pylint_output = json.loads(result.stdout) if result.stdout else []
                results["checks"]["pylint"] = {
                    "issues": pylint_output,
                    "count": len(pylint_output)
                }
                results["summary"]["total_issues"] += len(pylint_output)
            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                results["checks"]["pylint"] = {"error": "Analysis failed or pylint not installed"}

        # Run flake8
        if "flake8" in checks:
            try:
                result = subprocess.run(
                    ["flake8", temp_file, "--format=json"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                flake8_output = result.stdout
                results["checks"]["flake8"] = {
                    "output": flake8_output,
                    "issues": flake8_output.count("\n") if flake8_output else 0
                }
            except (subprocess.TimeoutExpired, FileNotFoundError):
                results["checks"]["flake8"] = {"error": "Analysis failed or flake8 not installed"}

        # Calculate complexity
        if "complexity" in checks:
            complexity_score = calculate_complexity(code)
            results["checks"]["complexity"] = {
                "score": complexity_score,
                "rating": get_complexity_rating(complexity_score)
            }

    finally:
        # Cleanup temp file
        if os.path.exists(temp_file):
            os.unlink(temp_file)

    return results


@celery_app.task(base=AnalysisTask, name="app.tasks.analysis_tasks.analyze_javascript")
def analyze_javascript(code: str, checks: List[str] = None) -> Dict[str, Any]:
    """
    Run static analysis on JavaScript/TypeScript code (eslint)

    Args:
        code: JavaScript code to analyze
        checks: List of checks to run

    Returns:
        Dictionary with analysis results
    """
    if checks is None:
        checks = ["eslint"]

    results = {
        "status": "success",
        "checks": {},
        "summary": {
            "total_issues": 0,
            "errors": 0,
            "warnings": 0
        }
    }

    # Write code to temporary file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        # Run eslint
        if "eslint" in checks:
            try:
                result = subprocess.run(
                    ["eslint", temp_file, "--format=json"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                eslint_output = json.loads(result.stdout) if result.stdout else []

                issues = []
                for file_result in eslint_output:
                    issues.extend(file_result.get("messages", []))

                results["checks"]["eslint"] = {
                    "issues": issues,
                    "count": len(issues)
                }
                results["summary"]["total_issues"] = len(issues)

            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                results["checks"]["eslint"] = {"error": "Analysis failed or eslint not installed"}

    finally:
        # Cleanup temp file
        if os.path.exists(temp_file):
            os.unlink(temp_file)

    return results


@celery_app.task(name="app.tasks.analysis_tasks.batch_analyze")
def batch_analyze(code_snippets: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Batch analysis of multiple code snippets

    Args:
        code_snippets: List of dicts with 'code' and 'language' keys

    Returns:
        List of analysis results
    """
    results = []

    for snippet in code_snippets:
        code = snippet.get("code")
        language = snippet.get("language", "python")

        if language == "python":
            result = analyze_python.apply_async(args=[code])
        elif language in ["javascript", "typescript"]:
            result = analyze_javascript.apply_async(args=[code])
        else:
            result = {"status": "error", "message": f"Unsupported language: {language}"}

        results.append({
            "snippet_id": snippet.get("id"),
            "task_id": result.id if hasattr(result, "id") else None,
            "status": "queued"
        })

    return results


@celery_app.task(name="app.tasks.analysis_tasks.health_check")
def health_check() -> Dict[str, Any]:
    """
    Periodic health check task for workers

    Returns:
        Health status dictionary
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "worker": "analysis"
    }


def calculate_complexity(code: str) -> int:
    """
    Calculate cyclomatic complexity of code

    Args:
        code: Source code

    Returns:
        Complexity score
    """
    # Simple complexity calculation based on control flow keywords
    keywords = ["if", "elif", "else", "for", "while", "try", "except", "and", "or"]
    complexity = 1  # Base complexity

    for keyword in keywords:
        complexity += code.count(f" {keyword} ")
        complexity += code.count(f"\n{keyword} ")

    return complexity


def get_complexity_rating(score: int) -> str:
    """
    Get complexity rating from score

    Args:
        score: Complexity score

    Returns:
        Rating string (Low, Medium, High, Very High)
    """
    if score <= 5:
        return "Low"
    elif score <= 10:
        return "Medium"
    elif score <= 20:
        return "High"
    else:
        return "Very High"
