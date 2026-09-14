from rest_framework.viewsets import ModelViewSet
from .models import Client, Home
from .serializers import ClientSerializer, HomeSerializer
from apps.accounts.permissions import ClientProfilePermission


class OrganisationScopedMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        organisation_id = getattr(self.request.user, "organisation_id", None)
        if organisation_id:
            field = "organisation_id" if self.basename == "home" else "home__organisation_id"
            return queryset.filter(**{field: organisation_id})
        return queryset.none()


class HomeViewSet(OrganisationScopedMixin, ModelViewSet):
    queryset = Home.objects.select_related("organisation").all()
    serializer_class = HomeSerializer
    permission_classes = [ClientProfilePermission]


class ClientViewSet(OrganisationScopedMixin, ModelViewSet):
    queryset = Client.objects.select_related("home", "home__organisation").all()
    serializer_class = ClientSerializer
    permission_classes = [ClientProfilePermission]
