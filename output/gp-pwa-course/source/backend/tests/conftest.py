import datetime as dt
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.clients.models import Client, Home, Organisation
from apps.medications.models import MedicationOrder


@pytest.fixture
def organisation(db):
    return Organisation.objects.create(name="Test Care Provider")


@pytest.fixture
def user(organisation):
    return get_user_model().objects.create_user(username="test-rn", password="test-password", role="RN", organisation=organisation, mfa_enabled=True)


@pytest.fixture
def medication_order(user, organisation):
    home = Home.objects.create(organisation=organisation, name="Banksia House", suburb="Sydney")
    client = Client.objects.create(home=home, given_name="Jamie", family_name="Test", date_of_birth=dt.date(1990, 1, 1))
    return MedicationOrder.objects.create(
        patient=client, drug="Test medication", dose="10 mg", route="Oral",
        scheduled_time=dt.time(8, 0), documentation_instructions="Record outcome",
        reason="Routine therapy", expected_response="Observe response",
        prescriber="Dr Test", starts_on=timezone.localdate(), created_by=user,
    )
