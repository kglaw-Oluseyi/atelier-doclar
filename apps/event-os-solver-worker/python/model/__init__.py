"""Production CP-SAT seating model (Stage A + Stage B)."""

from .solve import solve_request
from .status import PRODUCT_STATUSES

__all__ = ["solve_request", "PRODUCT_STATUSES"]
