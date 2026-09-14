from rest_framework.viewsets import ModelViewSet
from .models import MedicationOrder
from .serializers import MedicationOrderSerializer
from apps.accounts.permissions import MedicationOrderPermission


class MedicationOrderViewSet(ModelViewSet):
    serializer_class = MedicationOrderSerializer
    permission_classes = [MedicationOrderPermission]

    def get_queryset(self):
        organisation_id = getattr(self.request.user, "organisation_id", None)
        return MedicationOrder.objects.select_related("patient", "patient__home").filter(patient__home__organisation_id=organisation_id) if organisation_id else MedicationOrder.objects.none()
