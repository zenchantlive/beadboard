"""
RLM-MEM - Cache System Tests
D5.1: Memory caching tests (Disk Cache removed per ADR 0002)
"""

import unittest
import time
from pathlib import Path

try:
    from brain.scripts.cache_system import MemoryCache, CacheManager
except ImportError:
    from cache_system import MemoryCache, CacheManager


class TestMemoryCache(unittest.TestCase):
    """Test in-memory cache."""
    
    def setUp(self):
        self.cache = MemoryCache(default_ttl=60)
    
    def test_basic_get_set(self):
        """Should store and retrieve values."""
        self.cache.set("key1", "value1")
        result = self.cache.get("key1")
        self.assertEqual(result, "value1")
    
    def test_missing_key(self):
        """Should return None for missing key."""
        result = self.cache.get("nonexistent")
        self.assertIsNone(result)
    
    def test_expiration(self):
        """Should expire entries after TTL."""
        cache = MemoryCache(default_ttl=1)  # 1 second TTL
        cache.set("key", "value")
        
        # Should exist immediately
        self.assertEqual(cache.get("key"), "value")
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be expired
        self.assertIsNone(cache.get("key"))
    
    def test_delete(self):
        """Should delete keys."""
        self.cache.set("key", "value")
        self.assertTrue(self.cache.delete("key"))
        self.assertIsNone(self.cache.get("key"))
    
    def test_clear(self):
        """Should clear all entries."""
        self.cache.set("key1", "value1")
        self.cache.set("key2", "value2")
        
        self.cache.clear()
        
        self.assertIsNone(self.cache.get("key1"))
        self.assertIsNone(self.cache.get("key2"))
    
    def test_cleanup(self):
        """Should remove expired entries."""
        cache = MemoryCache(default_ttl=1)
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        time.sleep(1.1)
        
        removed = cache.cleanup()
        self.assertEqual(removed, 2)
    
    def test_stats(self):
        """Should return stats."""
        self.cache.set("key1", "value1")
        self.cache.set("key2", "value2")
        
        stats = self.cache.stats()
        self.assertEqual(stats["size"], 2)
        self.assertEqual(stats["default_ttl"], 60)


class TestCacheManager(unittest.TestCase):
    """Test simplified cache manager."""
    
    def setUp(self):
        self.manager = CacheManager()
    
    def test_get_set(self):
        """Should use memory cache by default."""
        self.manager.set("key", "value")
        result = self.manager.get("key")
        self.assertEqual(result, "value")
    
    def test_stats(self):
        """Should return stats."""
        self.manager.set("key", "value")
        
        stats = self.manager.stats()
        self.assertIn("memory", stats)
        self.assertIn("manager", stats)

    def test_manager_telemetry_memory_hit_and_miss(self):
        """Should track memory hits and misses at manager level."""
        self.manager.set("k1", "v1")
        self.assertEqual(self.manager.get("k1"), "v1")  # memory hit
        self.assertIsNone(self.manager.get("missing"))  # miss

        telemetry = self.manager.telemetry()
        self.assertEqual(telemetry["get_calls"], 2)
        self.assertEqual(telemetry["memory_hits"], 1)
        self.assertEqual(telemetry["misses"], 1)

if __name__ == "__main__":
    unittest.main()