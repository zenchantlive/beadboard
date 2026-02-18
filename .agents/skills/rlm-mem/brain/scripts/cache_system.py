"""
RLM-MEM - Cache System (D5.1)
Simple in-memory caching for frequently accessed data.
"""

import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass
from threading import Lock


logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Single cache entry."""
    value: Any
    timestamp: float
    ttl: int  # Time to live in seconds


class MemoryCache:
    """Thread-safe in-memory cache with TTL support."""
    
    def __init__(self, default_ttl: int = 300):
        """
        Initialize memory cache.
        
        Args:
            default_ttl: Default time-to-live in seconds (5 minutes)
        """
        self._cache: Dict[str, CacheEntry] = {}
        self._default_ttl = default_ttl
        self._lock = Lock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0
        self._lookups = 0
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            self._lookups += 1
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                logger.debug("Memory cache miss for %s", key)
                return None
            
            # Check if expired
            if time.time() - entry.timestamp > entry.ttl:
                del self._cache[key]
                self._misses += 1
                self._evictions += 1
                logger.debug("Memory cache evicted expired entry for %s", key)
                return None
            
            self._hits += 1
            logger.debug("Memory cache hit for %s", key)
            return entry.value
    
    def set(self, key: str, value: Any, ttl: int = None):
        """
        Store value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        if ttl is None:
            ttl = self._default_ttl
        
        with self._lock:
            self._cache[key] = CacheEntry(
                value=value,
                timestamp=time.time(),
                ttl=ttl
            )
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if key was present and deleted
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
    
    def cleanup(self):
        """Remove all expired entries."""
        with self._lock:
            now = time.time()
            expired = [
                key for key, entry in self._cache.items()
                if now - entry.timestamp > entry.ttl
            ]
            for key in expired:
                del self._cache[key]
            self._evictions += len(expired)
            if expired:
                logger.debug("Memory cache cleanup evicted %d entries", len(expired))
            return len(expired)
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            hit_rate = (self._hits / self._lookups) if self._lookups else 0.0
            return {
                "size": len(self._cache),
                "default_ttl": self._default_ttl,
                "lookups": self._lookups,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_rate": round(hit_rate, 4)
            }


class CacheManager:
    """
    Manages in-memory cache.
    (Disk cache tier removed per ADR 0002)
    """
    
    def __init__(self, cache_dir: str = None, default_ttl: int = 300):
        """
        Initialize cache manager.
        
        Args:
            cache_dir: Ignored (legacy compatibility)
            default_ttl: Default time-to-live in seconds
        """
        self.memory = MemoryCache(default_ttl)
        self._lock = Lock()
        self._metrics: Dict[str, int] = {
            "get_calls": 0,
            "memory_hits": 0,
            "misses": 0,
            "set_calls": 0,
            "delete_calls": 0,
            "clear_calls": 0,
        }
    
    def get(self, key: str, use_disk: bool = False) -> Optional[Any]:
        """
        Get from memory cache.
        
        Args:
            key: Cache key
            use_disk: Ignored (legacy compatibility)
            
        Returns:
            Cached value or None
        """
        with self._lock:
            self._metrics["get_calls"] += 1

        value = self.memory.get(key)
        if value is not None:
            with self._lock:
                self._metrics["memory_hits"] += 1
            return value
        
        with self._lock:
            self._metrics["misses"] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: int = None, use_disk: bool = False):
        """
        Store in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live
            use_disk: Ignored
        """
        with self._lock:
            self._metrics["set_calls"] += 1
        self.memory.set(key, value, ttl)
    
    def delete(self, key: str) -> bool:
        """Delete from cache."""
        with self._lock:
            self._metrics["delete_calls"] += 1
        return self.memory.delete(key)
    
    def clear(self):
        """Clear all caches."""
        with self._lock:
            self._metrics["clear_calls"] += 1
        self.memory.clear()

    def telemetry(self) -> Dict[str, Any]:
        """Return manager-level telemetry with derived rates."""
        with self._lock:
            metrics = dict(self._metrics)
        total_gets = metrics["get_calls"]
        metrics["memory_hit_rate"] = round(
            (metrics["memory_hits"] / total_gets), 4
        ) if total_gets else 0.0
        metrics["miss_rate"] = round(
            (metrics["misses"] / total_gets), 4
        ) if total_gets else 0.0
        return metrics
    
    def cleanup(self) -> Dict[str, int]:
        """Cleanup expired entries from cache."""
        mem_removed = self.memory.cleanup()
        return {"memory": mem_removed}
    
    def stats(self) -> Dict[str, Any]:
        """Get combined cache statistics."""
        return {
            "memory": self.memory.stats(),
            "manager": self.telemetry()
        }