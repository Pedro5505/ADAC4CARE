from rest_framework import mixins, viewsets
from .models import AdministrationEvent
from .serializers import AdministrationEventSerializer
from apps.accounts.permissions import AdministrationPermission


class AdministrationEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AdministrationEventSerializer
    permission_classes = [AdministrationPermission]

    def get_queryset(self):
        organisation_id = getattr(self.request.user, "organisation_id", None)
        return AdministrationEvent.objects.select_related("order", "order__patient").filter(order__patient__home__organisation_id=organisation_id) if organisation_id else AdministrationEvent.objects.none()
