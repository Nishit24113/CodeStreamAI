"""
Unit tests for Celery tasks
"""

import pytest
from app.tasks.analysis_tasks import calculate_complexity, get_complexity_rating
from app.tasks.security_tasks import detect_security_patterns, detect_js_security_patterns


def test_calculate_complexity():
    """Test complexity calculation"""
    simple_code = "print('hello')"
    complex_code = """
if condition:
    for i in range(10):
        while True:
            if x and y or z:
                try:
                    pass
                except:
                    pass
    """

    simple_score = calculate_complexity(simple_code)
    complex_score = calculate_complexity(complex_code)

    assert simple_score == 1  # Base complexity
    assert complex_score > simple_score


def test_get_complexity_rating():
    """Test complexity rating"""
    assert get_complexity_rating(3) == "Low"
    assert get_complexity_rating(7) == "Medium"
    assert get_complexity_rating(15) == "High"
    assert get_complexity_rating(25) == "Very High"


def test_detect_security_patterns_eval():
    """Test detection of eval() usage"""
    code_with_eval = """
result = eval(user_input)
exec(malicious_code)
    """

    patterns = detect_security_patterns(code_with_eval)

    assert len(patterns) > 0
    assert any(p["pattern"] == "eval/exec usage" for p in patterns)
    assert any(p["severity"] == "high" for p in patterns)


def test_detect_security_patterns_pickle():
    """Test detection of unsafe pickle usage"""
    code_with_pickle = """
import pickle
data = pickle.loads(untrusted_data)
    """

    patterns = detect_security_patterns(code_with_pickle)

    assert len(patterns) > 0
    assert any("pickle" in p["pattern"] for p in patterns)


def test_detect_security_patterns_sql_injection():
    """Test detection of SQL injection risk"""
    code_with_sql = """
query = "SELECT * FROM users WHERE id = " + user_id
cursor.execute(query)
    """

    patterns = detect_security_patterns(code_with_sql)

    assert len(patterns) > 0
    assert any("SQL injection" in p["pattern"] for p in patterns)


def test_detect_security_patterns_hardcoded_password():
    """Test detection of hardcoded passwords"""
    code_with_password = """
password = "admin123"
SECRET_KEY = "super_secret"
    """

    patterns = detect_security_patterns(code_with_password)

    assert len(patterns) > 0
    assert any("password" in p["pattern"].lower() for p in patterns)


def test_detect_js_security_patterns_eval():
    """Test detection of eval() in JavaScript"""
    js_code = """
var result = eval(userInput);
    """

    patterns = detect_js_security_patterns(js_code)

    assert len(patterns) > 0
    assert any(p["pattern"] == "eval usage" for p in patterns)
    assert any(p["severity"] == "high" for p in patterns)


def test_detect_js_security_patterns_innerhtml():
    """Test detection of innerHTML XSS risk"""
    js_code = """
element.innerHTML = userInput;
    """

    patterns = detect_js_security_patterns(js_code)

    assert len(patterns) > 0
    assert any("innerHTML" in p["pattern"] for p in patterns)


def test_detect_js_security_patterns_dangerously_set():
    """Test detection of dangerouslySetInnerHTML in React"""
    react_code = """
<div dangerouslySetInnerHTML={{__html: userContent}} />
    """

    patterns = detect_js_security_patterns(react_code)

    assert len(patterns) > 0
    assert any("dangerouslySetInnerHTML" in p["pattern"] for p in patterns)


def test_detect_js_security_patterns_document_write():
    """Test detection of document.write"""
    js_code = """
document.write(content);
    """

    patterns = detect_js_security_patterns(js_code)

    assert len(patterns) > 0
    assert any("document.write" in p["pattern"] for p in patterns)


def test_no_security_issues():
    """Test clean code with no security issues"""
    clean_code = """
def add(a, b):
    return a + b
    """

    patterns = detect_security_patterns(clean_code)

    assert len(patterns) == 0
