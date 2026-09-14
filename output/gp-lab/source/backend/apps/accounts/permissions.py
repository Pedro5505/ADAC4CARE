from rest_framework.permissions import BasePermission, SAFE_METHODS


class MedicationOrderPermission(BasePermission):
    """Everyone in the authorised care team may read; only a GP may prescribe."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return getattr(request.user, "role", None) in {"GP", "ADMIN"}


class AdministrationPermission(BasePermission):
    """Carers and RNs can record administration; other clinical roles are read-only."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return getattr(request.user, "role", None) in {"CARER", "RN", "ADMIN"}


class ClientProfilePermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return getattr(request.user, "role", None) in {"RN", "MANAGEMENT", "ADMIN"}


class CareMessagePermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated
