#!/usr/bin/env python3
"""Crash containment fixture — exits hard without touching supervisor memory."""
import os
os._exit(99)
