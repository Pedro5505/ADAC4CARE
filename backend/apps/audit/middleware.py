from .models import AuditEvent


class AuditAccessMiddleware:
    """Logs authenticated API access; payloads are excluded to avoid duplicating health data."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/") and getattr(request.user, "is_authenticated", False):
            action = {"GET": "READ", "POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE_ATTEMPT"}.get(request.method)
            if action:
                parts = [part for part in request.path.split("/") if part]
                AuditEvent.objects.create(
                    actor=request.user,
                    action=action,
                    resource_type=parts[1] if len(parts) > 1 else "api",
                    resource_id=parts[2] if len(parts) > 2 else "",
                    request_path=request.path[:500],
                    metadata={"status_code": response.status_code, "method": request.method},
                )
        return response
