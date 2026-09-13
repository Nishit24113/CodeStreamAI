"""
Celery tasks for security analysis (vulnerability scanning, dependency checks)
"""

from celery import Task
from app.celery_app import celery_app
import subprocess
import json
import tempfile
import os
from typing import Dict, List, Any
import re


class SecurityTask(Task):
    """Base task for security analysis"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        print(f"Security task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@celery_app.task(base=SecurityTask, name="app.tasks.security_tasks.scan_python_security")
def scan_python_security(code: str) -> Dict[str, Any]:
    """
    Scan Python code for security vulnerabilities using bandit

    Args:
        code: Python code to scan

    Returns:
        Security scan results
    """
    results = {
        "status": "success",
        "vulnerabilities": [],
        "summary": {
            "high": 0,
            "medium": 0,
            "low": 0,
            "total": 0
        },
        "patterns_detected": []
    }

    # Write code to temporary file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        # Run bandit security scanner
        try:
            result = subprocess.run(
                ["bandit", "-f", "json", temp_file],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.stdout:
                bandit_output = json.loads(result.stdout)
                vulnerabilities = bandit_output.get("results", [])

                for vuln in vulnerabilities:
                    severity = vuln.get("issue_severity", "UNDEFINED").lower()
                    results["vulnerabilities"].append({
                        "line": vuln.get("line_number"),
                        "severity": severity,
                        "confidence": vuln.get("issue_confidence"),
                        "issue": vuln.get("issue_text"),
                        "cwe_id": vuln.get("test_id")
                    })

                    if severity == "high":
                        results["summary"]["high"] += 1
                    elif severity == "medium":
                        results["summary"]["medium"] += 1
                    elif severity == "low":
                        results["summary"]["low"] += 1

                results["summary"]["total"] = len(vulnerabilities)

        except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
            results["error"] = "Bandit not installed or scan failed"

        # Manual pattern detection for common vulnerabilities
        patterns = detect_security_patterns(code)
        results["patterns_detected"] = patterns

    finally:
        # Cleanup temp file
        if os.path.exists(temp_file):
            os.unlink(temp_file)

    return results


@celery_app.task(base=SecurityTask, name="app.tasks.security_tasks.scan_javascript_security")
def scan_javascript_security(code: str) -> Dict[str, Any]:
    """
    Scan JavaScript/TypeScript code for security vulnerabilities

    Args:
        code: JavaScript code to scan

    Returns:
        Security scan results
    """
    results = {
        "status": "success",
        "vulnerabilities": [],
        "patterns_detected": [],
        "summary": {
            "high": 0,
            "medium": 0,
            "low": 0,
            "total": 0
        }
    }

    # Manual pattern detection for JavaScript
    patterns = detect_js_security_patterns(code)
    results["patterns_detected"] = patterns

    # Count severity
    for pattern in patterns:
        severity = pattern.get("severity", "low")
        results["summary"][severity] += 1

    results["summary"]["total"] = len(patterns)

    return results


@celery_app.task(name="app.tasks.security_tasks.check_secrets")
def check_secrets(code: str) -> Dict[str, Any]:
    """
    Check for hardcoded secrets (API keys, passwords, tokens)

    Args:
        code: Code to check

    Returns:
        Dictionary with found secrets
    """
    results = {
        "status": "success",
        "secrets_found": [],
        "high_risk": False
    }

    # Patterns for common secrets
    secret_patterns = [
        (r'api[_-]?key\s*=\s*["\']([^"\']+)["\']', "API Key"),
        (r'password\s*=\s*["\']([^"\']+)["\']', "Password"),
        (r'secret\s*=\s*["\']([^"\']+)["\']', "Secret"),
        (r'token\s*=\s*["\']([^"\']+)["\']', "Token"),
        (r'aws[_-]?access[_-]?key\s*=\s*["\']([^"\']+)["\']', "AWS Access Key"),
        (r'github[_-]?token\s*=\s*["\']([^"\']+)["\']', "GitHub Token"),
        (r'bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', "Bearer Token"),
    ]

    for pattern, secret_type in secret_patterns:
        matches = re.finditer(pattern, code, re.IGNORECASE)
        for match in matches:
            results["secrets_found"].append({
                "type": secret_type,
                "line": code[:match.start()].count("\n") + 1,
                "matched": match.group(0)[:20] + "..." if len(match.group(0)) > 20 else match.group(0)
            })
            results["high_risk"] = True

    return results


@celery_app.task(name="app.tasks.security_tasks.batch_security_scan")
def batch_security_scan(code_snippets: List[Dict[str, str]]) -> List[str]:
    """
    Batch security scanning of multiple code snippets

    Args:
        code_snippets: List of code snippets with language

    Returns:
        List of task IDs
    """
    task_ids = []

    for snippet in code_snippets:
        code = snippet.get("code")
        language = snippet.get("language", "python")

        if language == "python":
            task = scan_python_security.apply_async(args=[code])
        elif language in ["javascript", "typescript"]:
            task = scan_javascript_security.apply_async(args=[code])
        else:
            continue

        task_ids.append(task.id)

    return task_ids


def detect_security_patterns(code: str) -> List[Dict[str, str]]:
    """
    Detect common security anti-patterns in Python code

    Args:
        code: Python code

    Returns:
        List of detected patterns
    """
    patterns = []

    # Check for eval/exec usage
    if "eval(" in code or "exec(" in code:
        patterns.append({
            "pattern": "eval/exec usage",
            "severity": "high",
            "description": "Using eval() or exec() can lead to code injection vulnerabilities"
        })

    # Check for pickle usage
    if "pickle.loads" in code:
        patterns.append({
            "pattern": "unsafe pickle.loads",
            "severity": "high",
            "description": "pickle.loads on untrusted data can execute arbitrary code"
        })

    # Check for SQL concatenation
    if re.search(r'execute\(["\'].*\+.*["\']', code):
        patterns.append({
            "pattern": "SQL injection risk",
            "severity": "high",
            "description": "SQL query concatenation can lead to SQL injection"
        })

    # Check for hardcoded credentials
    if re.search(r'password\s*=\s*["\'][^"\']+["\']', code, re.IGNORECASE):
        patterns.append({
            "pattern": "hardcoded password",
            "severity": "medium",
            "description": "Passwords should not be hardcoded"
        })

    return patterns


def detect_js_security_patterns(code: str) -> List[Dict[str, str]]:
    """
    Detect common security anti-patterns in JavaScript code

    Args:
        code: JavaScript code

    Returns:
        List of detected patterns
    """
    patterns = []

    # Check for eval usage
    if "eval(" in code:
        patterns.append({
            "pattern": "eval usage",
            "severity": "high",
            "description": "eval() can execute arbitrary code and is a security risk"
        })

    # Check for innerHTML usage
    if ".innerHTML" in code and "=" in code:
        patterns.append({
            "pattern": "innerHTML assignment",
            "severity": "medium",
            "description": "innerHTML can lead to XSS vulnerabilities if user input is involved"
        })

    # Check for document.write
    if "document.write" in code:
        patterns.append({
            "pattern": "document.write usage",
            "severity": "medium",
            "description": "document.write can be exploited for XSS attacks"
        })

    # Check for dangerouslySetInnerHTML (React)
    if "dangerouslySetInnerHTML" in code:
        patterns.append({
            "pattern": "dangerouslySetInnerHTML",
            "severity": "high",
            "description": "Can lead to XSS if not properly sanitized"
        })

    return patterns
