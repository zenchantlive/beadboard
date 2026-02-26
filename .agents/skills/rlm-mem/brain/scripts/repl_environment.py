"""
RLM-MEM - REPL Environment (D1.3)
RLM-style external memory REPL with secure sandbox execution.
"""

import ast
import builtins
import threading
import time
import io
import sys
from contextlib import contextmanager
from typing import Any, Dict, Optional, Callable
from pathlib import Path


class SandboxViolation(Exception):
    """Raised when code attempts to violate sandbox security."""
    pass


class MaxIterationsError(Exception):
    """Raised when max iterations exceeded."""
    pass


# Cost budget exceeded
class CostBudgetExceededError(RuntimeError):
    """Raised when cost budget is exceeded."""
    pass


# Use built-in TimeoutError


# Allowed built-ins for sandbox
ALLOWED_BUILTINS = {
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
    'callable', 'chr', 'classmethod', 'complex', 'delattr', 'dict',
    'dir', 'divmod', 'enumerate', 'filter', 'float', 'format', 'frozenset',
    'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input',
    'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals',
    'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'ord',
    'pow', 'print', 'property', 'range', 'repr', 'reversed',
    'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str',
    'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__build_class__',
    '__name__', 'True', 'False', 'None', 'Exception', 'TypeError',
    'ValueError', 'KeyError', 'IndexError', 'AttributeError', 'RuntimeError',
    'StopIteration', 'ArithmeticError', 'LookupError', 'AssertionError',
    'NotImplementedError', 'ZeroDivisionError', 'OverflowError',
}

# Blocked imports/modules
BLOCKED_MODULES = {
    'os', 'sys', 'subprocess', 'socket', 'urllib', 'http', 'ftplib',
    'smtplib', 'telnetlib', 'poplib', 'imaplib', 'nntplib', 'ssl',
    'email', 'xmlrpc', 'concurrent.futures.process', 'multiprocessing',
    'ctypes', 'cffi', 'mmap', 'resource', 'posix', 'nt', 'pwd', 'grp',
    'spwd', 'crypt', 'termios', 'tty', 'pty', 'fcntl', 'msvcrt',
    'winreg', '_winapi', 'select', 'selectors', 'asyncio.subprocess',
}

# Allowed modules that get redirected to mocks
ALLOWED_MODULES = set()


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    """Safe import function that only allows specific modules."""
    base_module = name.split('.')[0] if name else ''
    # Allow sys import (mocked in sandbox)
    if base_module == 'sys':
        if globals and 'sys' in globals:
            return globals['sys']
        raise ImportError("Mock sys not found in sandbox")
    if base_module in ALLOWED_MODULES:
        if globals and base_module in globals:
            return globals[base_module]
        raise ImportError(f"Mock {name} not found in sandbox")
    raise ImportError(f"Import of '{name}' is not allowed in sandbox")


# Blocked attribute names that could be used for sandbox escape
BLOCKED_ATTRIBUTES = {
    '__class__', '__bases__', '__subclasses__', '__base__', 
    '__mro__', '__globals__', '__code__', '__func__', '__self__',
    '__module__', '__dict__', '__closure__', '__defaults__',
    '__kwdefaults__', '__getattribute__', '__setattr__',
}


class SandboxVisitor(ast.NodeVisitor):
    """AST visitor to check for sandbox violations."""
    
    def __init__(self, allowed_paths: Optional[list] = None):
        self.allowed_paths = allowed_paths or []
        self.violations = []
    
    def visit_Import(self, node):
        for alias in node.names:
            module = alias.name.split('.')[0]
            # Allow 'sys' import (redirected to mock in sandbox)
            if module == 'sys':
                continue
            if module in BLOCKED_MODULES and module not in ALLOWED_MODULES:
                self.violations.append(f"Import of '{module}' is not allowed")
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        if node.module:
            module = node.module.split('.')[0]
            # Allow 'sys' import (redirected to mock in sandbox)
            if module == 'sys':
                return
            if module in BLOCKED_MODULES and module not in ALLOWED_MODULES:
                self.violations.append(f"Import from '{module}' is not allowed")
        self.generic_visit(node)
    
    def visit_Delete(self, node):
        """Block deletion of builtins attributes."""
        for target in node.targets:
            if isinstance(target, ast.Attribute):
                if self._is_builtins_access(target.value):
                    self.violations.append("Deletion of __builtins__ attributes is not allowed")
            if isinstance(target, ast.Subscript):
                if self._is_builtins_access(target.value):
                    self.violations.append("Deletion of __builtins__ attributes is not allowed")
        self.generic_visit(node)
    
    def visit_Call(self, node):
        # Check for eval/exec/compile
        if isinstance(node.func, ast.Name):
            if node.func.id in ('eval', 'exec', 'compile'):
                self.violations.append(f"Use of '{node.func.id}()' is not allowed")
        # Check for __import__
        if isinstance(node.func, ast.Name) and node.func.id == '__import__':
            self.violations.append("Use of '__import__()' is not allowed")
        # Check for open()
        if isinstance(node.func, ast.Name) and node.func.id == 'open':
            self.violations.append("Use of 'open()' is not allowed")
        
        # Check for getattr/setattr on __builtins__
        if isinstance(node.func, ast.Name) and node.func.id == 'getattr':
            if node.args and self._is_builtins_access(node.args[0]):
                self.violations.append("getattr on __builtins__ is not allowed")
        if isinstance(node.func, ast.Name) and node.func.id == 'setattr':
            if node.args and self._is_builtins_access(node.args[0]):
                self.violations.append("setattr on __builtins__ is not allowed")
        if isinstance(node.func, ast.Name) and node.func.id == 'delattr':
            if node.args and self._is_builtins_access(node.args[0]):
                self.violations.append("delattr on __builtins__ is not allowed")
        
        self.generic_visit(node)
    
    def visit_BinOp(self, node):
        """Check for large memory allocations via string/list multiplication."""
        if isinstance(node.op, ast.Mult):
            # Check for patterns like "x" * (1024 * 1024 * 100)
            # Try to evaluate the size statically
            try:
                if isinstance(node.left, ast.Constant) and isinstance(node.left.value, str):
                    if isinstance(node.right, ast.Constant):
                        size = len(node.left.value) * node.right.value
                        if size > 10 * 1024 * 1024:  # 10MB limit
                            raise MemoryError(f"String multiplication would create {size} bytes, exceeding 10MB limit")
                    elif isinstance(node.right, ast.BinOp):
                        # Try to evaluate binary expression
                        size = len(node.left.value) * self._eval_const_expr(node.right)
                        if size > 10 * 1024 * 1024:  # 10MB limit
                            raise MemoryError(f"String multiplication would create {size} bytes, exceeding 10MB limit")
            except MemoryError:
                raise  # Re-raise MemoryError
            except Exception:
                pass  # Can't evaluate statically, let it run and catch at runtime
        self.generic_visit(node)
    
    def _eval_const_expr(self, node):
        """Try to evaluate a constant expression statically."""
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.BinOp):
            left = self._eval_const_expr(node.left)
            right = self._eval_const_expr(node.right)
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
        raise ValueError("Cannot evaluate expression")
    
    def visit_Attribute(self, node):
        """Check for dangerous attribute access like __class__, __bases__, etc."""
        if node.attr in BLOCKED_ATTRIBUTES:
            self.violations.append(f"Access to '{node.attr}' is not allowed")
        self.generic_visit(node)
    
    def visit_Subscript(self, node):
        """Check for builtins subscript access like globals()['__builtins__']['__import__']."""
        # Check for globals()['__builtins__'] or locals()['__builtins__']
        if isinstance(node.value, ast.Call):
            if isinstance(node.value.func, ast.Name) and node.value.func.id in ('globals', 'locals'):
                if isinstance(node.slice, ast.Constant) and node.slice.value == '__builtins__':
                    self.violations.append("globals()/locals()['__builtins__'] manipulation is not allowed")
                elif hasattr(node.slice, 's') and node.slice.s == '__builtins__':  # Python < 3.8 compatibility
                    self.violations.append("globals()/locals()['__builtins__'] manipulation is not allowed")
        self.generic_visit(node)
    
    def _is_builtins_access(self, node):
        """Check if a node represents access to __builtins__."""
        if isinstance(node, ast.Name) and node.id == '__builtins__':
            return True
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in ('globals', 'locals'):
                return True
        return False


class MemoryLimitException(RuntimeError):
    """Raised when memory limit is exceeded."""
    pass


# Module-level check_safety function
def check_safety(code: str) -> list:
    """Check code for sandbox violations."""
    # Pre-check for null bytes and other dangerous characters
    if '\x00' in code:
        return ["Code contains null bytes which is not allowed"]
    
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []  # Let SyntaxError be handled elsewhere
    
    visitor = SandboxVisitor()
    visitor.visit(tree)
    return visitor.violations


# Standalone llm_query function for import compatibility
def llm_query(prompt: str, context: Dict[str, Any] = None) -> str:
    """
    Standalone llm_query function.
    Note: This is a placeholder - use REPLSession.llm_query() for actual queries.
    """
    raise RuntimeError("llm_query must be called from a REPLSession instance")


def FINAL(answer) -> None:
    """Signal that REPL has reached final answer."""
    raise RuntimeError("FINAL() must be called from within a REPL session")


class REPLSession:
    """
    RLM REPL Session - secure sandbox for recursive LLM execution.
    """
    
    class _StderrCapture:
        """Mock stderr object for sandbox."""
        def __init__(self, session):
            self._session = session
        
        def write(self, text: str):
            """Write to stderr capture."""
            self._session._stderr.append(text)
        
        def flush(self):
            """Flush stderr (no-op)."""
            pass
    
    class MockSys:
        """Mock sys module for sandbox with only stderr."""
        def __init__(self, stderr_capture):
            self.stderr = stderr_capture
        
        def __getattr__(self, name):
            if name == 'modules':
                raise SandboxViolation("Access to sys.modules is not allowed")
            raise AttributeError(f"sys.{name} is not available in sandbox")
    
    def __init__(self, chunk_store=None, llm_client=None, 
                 max_iterations: int = 10, timeout_seconds: int = 60, max_depth: int = 5,
                 max_cost_usd: Optional[float] = None):
        """
        Initialize REPL session.
        
        Args:
            chunk_store: ChunkStore instance for memory access
            llm_client: LLM client for recursive queries
            max_iterations: Maximum recursive iterations allowed
            timeout_seconds: Execution timeout
            max_depth: Maximum recursion depth
        """
        if chunk_store is None:
            raise ValueError("chunk_store is required")
        if llm_client is None:
            raise ValueError("llm_client is required")
        
        self.chunk_store = chunk_store
        self.llm_client = llm_client
        self.max_iterations = max_iterations
        self.timeout_seconds = timeout_seconds
        self.max_depth = max_depth
        self._max_cost_usd = max_cost_usd
        
        self._state: Dict[str, Any] = {}  # User state (empty initially)
        self._iteration_count = 0
        self._total_cost = 0.0
        self._current_depth = 0
        self._result = None
        self._complete = False
        self._lock = threading.RLock()
        self._output = []
        self._stderr = []
        self._stderr_capture = self._StderrCapture(self)
        
        # Create isolated namespace for execution
        self._namespace = {}
        self._setup_namespace()
    
    def _setup_namespace(self):
        """Set up the sandbox namespace."""
        # Safe builtins
        safe_builtins = {name: getattr(builtins, name) 
                        for name in ALLOWED_BUILTINS 
                        if hasattr(builtins, name)}
        
        # Inject memory functions
        from brain.scripts.repl_functions import read_chunk, search_chunks, list_chunks_by_tag, get_linked_chunks
        
        # Create bound methods
        safe_builtins['read_chunk'] = self._read_chunk_wrapper
        safe_builtins['search_chunks'] = self._search_chunks_wrapper
        safe_builtins['list_chunks_by_tag'] = self._list_chunks_by_tag_wrapper
        safe_builtins['get_linked_chunks'] = self._get_linked_chunks_wrapper
        safe_builtins['llm_query'] = self._llm_query_wrapper
        safe_builtins['FINAL'] = self._final_wrapper
        
        # Inject safe import and mock sys module
        safe_builtins['__import__'] = safe_import
        safe_builtins['sys'] = self.MockSys(self._stderr_capture)
        
        self._namespace = {
            '__builtins__': safe_builtins,
            '__name__': '__repl__',
        }
        
        # Inject mock sys module so 'import sys' binds to our mock
        self._namespace['sys'] = self.MockSys(self._stderr_capture)
        
        # Merge user state into namespace
        self._namespace.update(self._state)
    
    def _read_chunk_wrapper(self, chunk_id: str):
        """Wrapper for read_chunk."""
        from repl_functions import read_chunk
        return read_chunk(chunk_id, self.chunk_store)
    
    def _search_chunks_wrapper(self, query: str, limit: int = 10):
        """Wrapper for search_chunks."""
        from repl_functions import search_chunks
        return search_chunks(query, self.chunk_store, limit)
    
    def _list_chunks_by_tag_wrapper(self, tags):
        """Wrapper for list_chunks_by_tag."""
        from repl_functions import list_chunks_by_tag
        return list_chunks_by_tag(tags, self.chunk_store)
    
    def _get_linked_chunks_wrapper(self, chunk_id: str, link_type: str = None):
        """Wrapper for get_linked_chunks."""
        from repl_functions import get_linked_chunks
        return get_linked_chunks(chunk_id, self.chunk_store, link_type)
    
    def _llm_query_wrapper(self, prompt: str, context=None):
        """Wrapper for llm_query."""
        with self._lock:
            self._iteration_count += 1
            if self._iteration_count > self.max_iterations:
                raise MaxIterationsError(
                    f"Maximum iterations ({self.max_iterations}) exceeded"
                )
            
            # Check max depth
            if self._current_depth >= self.max_depth:
                raise RecursionError(f"Maximum recursion depth ({self.max_depth}) exceeded")
            
            # Increment depth counter
            self._current_depth += 1
        
        try:
            self._ensure_budget()
            # Build full prompt with context
            full_prompt = prompt
            if context:
                # Handle context as a list of chunk IDs
                if isinstance(context, list):
                    from repl_functions import read_chunk
                    context_parts = []
                    for chunk_id in context:
                        chunk = read_chunk(chunk_id, self.chunk_store)
                        if chunk:
                            context_parts.append(f"Chunk {chunk_id}:\n{chunk.get('content', '')}")
                        else:
                            context_parts.append(f"Chunk {chunk_id}:\n[Not found]")
                    context_str = "\n\n".join(context_parts)
                    full_prompt = f"Context:\n{context_str}\n\nPrompt:\n{prompt}"
                elif isinstance(context, dict):
                    context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
                    full_prompt = f"Context:\n{context_str}\n\nPrompt:\n{prompt}"
            
            # Call LLM
            response = self.llm_client.complete(full_prompt)
            
            self._record_cost(response)
            self._ensure_budget(allow_equal=True)
            
            return response.text if hasattr(response, 'text') else str(response)
        except (RecursionError, MaxIterationsError):
            # Don't catch these - let them propagate
            raise
        except Exception as e:
            # Handle API errors gracefully
            return f"Error: {str(e)}"
        finally:
            # Decrement depth counter
            with self._lock:
                self._current_depth -= 1
    
    def _final_wrapper(self, answer) -> None:
        """Wrapper for FINAL."""
        if self._complete:
            raise RuntimeError("FINAL() can only be called once per session")
        self._result = answer
        self._complete = True
    
    def get_state(self) -> Dict[str, Any]:
        """Get current state dictionary (user-defined variables only)."""
        return self._state.copy()
    
    def get_result(self) -> Optional[Any]:
        """Get final result if FINAL() was called."""
        return self._result
    
    def is_complete(self) -> bool:
        """Check if FINAL() has been called."""
        return self._complete
    
    @property
    def iteration_count(self) -> int:
        """Get current iteration count."""
        return self._iteration_count
    
    @property
    def total_cost(self) -> float:
        """Get total cost accumulated."""
        return self._total_cost
    
    def get_cost(self) -> float:
        """Get total cost accumulated."""
        return self._total_cost
    
    @property
    def total_cost(self) -> float:
        """Get total cost accumulated (property accessor)."""
        return self._total_cost
    
    def get_cost_breakdown(self) -> Dict[str, Any]:
        """Get detailed cost breakdown."""
        breakdown = {
            "total": self._total_cost,
            "calls": self._iteration_count,
            "per_call_average": self._total_cost / self._iteration_count if self._iteration_count > 0 else 0.0
        }
        if self._max_cost_usd is not None:
            remaining = self._max_cost_usd - self._total_cost
            breakdown.update({
                "budget": self._max_cost_usd,
                "remaining": max(0.0, remaining),
                "over_budget": self._total_cost > self._max_cost_usd
            })
        return breakdown
    
    def get_output(self) -> str:
        """Get captured output."""
        return "\n".join(self._output)
    
    def get_stderr(self) -> str:
        """Get captured stderr."""
        return "\n".join(self._stderr)
    
    def clear_output(self):
        """Clear captured output."""
        self._output = []
    
    def execute(self, code: str, timeout: int = None):
        """
        Execute code in sandbox.
        
        Args:
            code: Python code to execute
            timeout: Optional timeout override
            
        Returns:
            Result of the last expression or None
            
        Raises:
            RuntimeError: If called after FINAL()
            SandboxViolation: If code violates sandbox
            TimeoutError: If execution times out
        """
        if self._complete:
            raise RuntimeError("REPL already complete")
        
        if not code or not code.strip():
            return None
        
        # Check sandbox safety
        violations = check_safety(code)
        if violations:
            raise SandboxViolation(f"Sandbox violation: {violations[0]}")
        
        # Use provided timeout or default
        exec_timeout = timeout if timeout is not None else self.timeout_seconds
        
        # Capture stdout/stderr
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Container for execution results
        result_container = {'result': None, 'error': None, 'completed': False}
        
        def run_execution():
            try:
                sys.stdout = stdout_capture
                sys.stderr = stderr_capture
                
                # Try to eval as expression first
                try:
                    compiled = compile(code, '<repl>', 'eval')
                    result_container['result'] = eval(compiled, self._namespace)
                    result_container['completed'] = True
                    return
                except SyntaxError:
                    # Not an expression, try exec
                    pass
                
                # Compile and execute as statements
                compiled = compile(code, '<repl>', 'exec')
                exec(compiled, self._namespace)
                
                # Update state with user-defined variables
                for key, value in self._namespace.items():
                    if not key.startswith('_') and key not in ('__builtins__', '__name__'):
                        self._state[key] = value
                
                result_container['completed'] = True
                
            except Exception as e:
                result_container['error'] = e
        
        # Run execution in a thread with timeout
        exec_thread = threading.Thread(target=run_execution)
        exec_thread.daemon = True
        
        try:
            sys.stdout = stdout_capture
            sys.stderr = stderr_capture
            
            exec_thread.start()
            exec_thread.join(timeout=exec_timeout)
            
            if exec_thread.is_alive():
                # Thread is still running after timeout
                raise TimeoutError(f"Execution exceeded {exec_timeout} seconds")
            
            # Check for errors from the thread
            if result_container['error'] is not None:
                raise result_container['error']
            
            # Capture output
            self._output.append(stdout_capture.getvalue())
            self._stderr.append(stderr_capture.getvalue())
            
            return result_container['result']
            
        except TimeoutError:
            raise
        except RecursionError:
            # Let RecursionError propagate for depth limit testing
            raise
        except SandboxViolation:
            # Let SandboxViolation propagate for security tests
            raise
        except SyntaxError as e:
            error_msg = f"Syntax error: {e}"
            self._output.append(error_msg)
            return error_msg
        except ZeroDivisionError as e:
            error_msg = f"Zero division error: {e}"
            self._output.append(error_msg)
            return error_msg
        except NameError as e:
            # Return NameError as string for undefined name tests
            error_msg = f"Name error: {e}"
            self._output.append(error_msg)
            return error_msg
        except AttributeError as e:
            error_msg = f"Attribute error: {e}"
            self._output.append(error_msg)
            return error_msg
        except MemoryError as e:
            error_msg = f"Memory error: {e}"
            self._output.append(error_msg)
            return error_msg
        except Exception as e:
            # Other exceptions - return as error string
            error_msg = f"Runtime error: {e}"
            self._output.append(error_msg)
            return error_msg
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
    
    def retrieve(self, query=None, max_iterations=None) -> Optional[Any]:
        """
        Execute retrieval workflow for a query.
        
        Args:
            query: The query string to process
            max_iterations: Override max iterations for this retrieval
            
        Returns:
            Final answer or None if max iterations reached without FINAL()
        """
        if query is None:
            # Just return current result if no query
            return self._result if self._complete else None
        
        # Use provided max_iterations or default
        max_iter = max_iterations if max_iterations is not None else self.max_iterations
        
        # Build retrieval prompt
        retrieval_prompt = f"""You are a memory retrieval system. Answer the following query using the available memory functions.

Available functions:
- read_chunk(chunk_id): Read a chunk by ID
- search_chunks(query, limit=10): Search for chunks
- list_chunks_by_tag(tag): List chunks with a tag
- get_linked_chunks(chunk_id, link_type=None): Get linked chunks
- llm_query(prompt, context=None): Ask LLM for help
- FINAL(answer): Call when you have the final answer

Query: {query}

Write Python code to solve this query. Use FINAL('your answer') when done."""
        
        # Iterative retrieval loop
        for iteration in range(max_iter):
            self._iteration_count += 1
            
            # Get LLM response
            try:
                self._ensure_budget()
                response = self.llm_client.complete(retrieval_prompt)
                code = response.text if hasattr(response, 'text') else str(response)
                self._record_cost(response)
                self._ensure_budget(allow_equal=True)
            except Exception as e:
                # API error - return error message
                return f"Error: {str(e)}"
            
            # Execute the code
            try:
                result = self.execute(code)
                
                # Check if FINAL was called
                if self._complete:
                    return self._result
                    
            except Exception as e:
                # Execution error - add to prompt and continue
                retrieval_prompt += f"\n\nError in previous attempt: {str(e)}\nPlease try again."
                continue
        
        # Max iterations reached without FINAL
        return None
    
    def reset(self):
        """Reset session state."""
        self._state = {}
        self._iteration_count = 0
        self._total_cost = 0.0
        self._current_depth = 0
        self._result = None
        self._complete = False
        self._output = []
        self._stderr = []
        self._setup_namespace()

    def _record_cost(self, response: Any) -> None:
        """Record cost from response or LLM client."""
        cost_value = None
        if hasattr(response, 'cost_usd'):
            cost_value = response.cost_usd
        elif hasattr(self.llm_client, 'get_cost') and callable(self.llm_client.get_cost):
            cost_value = self.llm_client.get_cost()
        if not isinstance(cost_value, (int, float)):
            return
        self._total_cost += float(cost_value)

    def _ensure_budget(self, allow_equal: bool = False) -> None:
        """Ensure cost budget has not been exceeded."""
        if self._max_cost_usd is None:
            return
        if allow_equal:
            over_budget = self._total_cost > self._max_cost_usd
        else:
            over_budget = self._total_cost >= self._max_cost_usd
        if over_budget:
            raise CostBudgetExceededError(
                f"Cost budget exceeded: total_cost={self._total_cost:.6f} budget={self._max_cost_usd:.6f}"
            )
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.reset()
        return False
