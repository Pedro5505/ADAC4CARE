import pytest
from types import SimpleNamespace
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.administration.models import AdministrationEvent
from apps.audit.models import AuditEvent
from apps.accounts.permissions import AdministrationPermission, MedicationOrderPermission


@pytest.mark.django_db
def test_audit_event_cannot_be_deleted(user):
    event = AuditEvent.objects.create(actor=user, action="READ", resource_type="medication", request_path="/api/medication-orders/")
    with pytest.raises(ValidationError):
        event.delete()


@pytest.mark.django_db
def test_administration_requires_safety_checks(medication_order, user):
    event = AdministrationEvent(
        order=medication_order, patient_confirmed=False, drug_confirmed=True,
        dose_confirmed=True, route_confirmed=True, time_confirmed=True,
        documentation="Recorded", reason="Routine", response="Observed",
        outcome="ADMINISTERED", administered_by=user, administered_at=timezone.now(),
    )
    with pytest.raises(ValidationError):
        event.full_clean()


def test_only_gp_or_admin_can_write_medication_orders():
    permission = MedicationOrderPermission()
    assert permission.has_permission(SimpleNamespace(method="POST", user=SimpleNamespace(is_authenticated=True, role="GP")), None)
    assert not permission.has_permission(SimpleNamespace(method="POST", user=SimpleNamespace(is_authenticated=True, role="CARER")), None)


def test_only_carer_rn_or_admin_can_record_administration():
    permission = AdministrationPermission()
    assert permission.has_permission(SimpleNamespace(method="POST", user=SimpleNamespace(is_authenticated=True, role="RN")), None)
    assert not permission.has_permission(SimpleNamespace(method="POST", user=SimpleNamespace(is_authenticated=True, role="PHARMACIST")), None)
