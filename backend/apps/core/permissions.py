"""
Shared permission classes.

These are the ONLY source of truth for "who can do what" — React route
guards are UX convenience, never security. Every protected viewset in
every app imports from here rather than re-implementing role checks,
so there is exactly one place role logic can go wrong.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Staff/administrator accounts only (request.user.is_staff)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsAgent(BasePermission):
    """Field agent accounts only — must have an Agent profile and NOT be staff."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated) or request.user.is_staff:
            return False
        return hasattr(request.user, 'agent_profile')


class IsAdminOrAgent(BasePermission):
    """Any authenticated staff or agent account — used for the shared chat system."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_staff or hasattr(request.user, 'agent_profile')


class IsAdminOrReadOnly(BasePermission):
    """Public users can read (GET/HEAD/OPTIONS); only staff can write."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsOwnerAgentOrAdmin(BasePermission):
    """
    Object-level check for agent-owned resources (e.g. a SupplyRequest).
    Admins can access any object; an agent can only access their own.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        agent = getattr(request.user, 'agent_profile', None)
        owner_agent = getattr(obj, 'agent', None)
        return bool(agent and owner_agent and owner_agent.pk == agent.pk)
