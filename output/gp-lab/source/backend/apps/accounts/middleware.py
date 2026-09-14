from django.http import JsonResponse


class EnforceMfaMiddleware:
    """Blocks privileged API access until the configured identity provider confirms MFA."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if (
            request.path.startswith("/api/")
            and getattr(user, "is_authenticated", False)
            and getattr(user, "requires_mfa", False)
            and not request.session.get("mfa_verified", False)
        ):
            return JsonResponse({"detail": "Multi-factor authentication is required."}, status=403)
        return self.get_response(request)
