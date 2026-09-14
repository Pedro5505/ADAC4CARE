from django.db.models import Count, Q
from apps.administration.models import AdministrationEvent


def administration_summary(organisation_id, start, end, home_id=None, client_id=None):
    events = AdministrationEvent.objects.filter(
        order__patient__home__organisation_id=organisation_id,
        administered_at__date__range=(start, end),
    )
    if home_id:
        events = events.filter(order__patient__home_id=home_id)
    if client_id:
        events = events.filter(order__patient_id=client_id)
    return events.aggregate(
        total=Count("id"),
        administered=Count("id", filter=Q(outcome="ADMINISTERED")),
        exceptions=Count("id", filter=~Q(outcome="ADMINISTERED")),
    )
