from rest_framework.viewsets import ModelViewSet
from .models import ChartMessage
from .serializers import ChartMessageSerializer
from apps.accounts.permissions import CareMessagePermission


class ChartMessageViewSet(ModelViewSet):
    serializer_class = ChartMessageSerializer
    permission_classes = [CareMessagePermission]

    def get_queryset(self):
        organisation_id = getattr(self.request.user, "organisation_id", None)
        return ChartMessage.objects.filter(patient__home__organisation_id=organisation_id) if organisation_id else ChartMessage.objects.none()
