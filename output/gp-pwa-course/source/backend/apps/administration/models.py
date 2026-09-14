import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AdministrationEvent(models.Model):
    """Immutable clinical fact recording the eight rights at administration time."""

    class Outcome(models.TextChoices):
        ADMINISTERED = "ADMINISTERED", "Administered"
        WITHHELD = "WITHHELD", "Withheld"
        REFUSED = "REFUSED", "Refused"
        MISSED = "MISSED", "Missed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("medications.MedicationOrder", related_name="administrations", on_delete=models.PROTECT)
    patient_confirmed = models.BooleanField()
    drug_confirmed = models.BooleanField()
    dose_confirmed = models.BooleanField()
    route_confirmed = models.BooleanField()
    time_confirmed = models.BooleanField()
    documentation = models.TextField()
    reason = models.TextField()
    response = models.TextField()
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    administered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    administered_at = models.DateTimeField()
    device_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        checks = [self.patient_confirmed, self.drug_confirmed, self.dose_confirmed, self.route_confirmed, self.time_confirmed]
        if self.outcome == self.Outcome.ADMINISTERED and not all(checks):
            raise ValidationError("All identity, medication, dose, route, and time checks must pass before administration.")
        if not self.documentation or not self.reason or not self.response:
            raise ValidationError("Documentation, reason, and response are required.")

    def save(self, *args, **kwargs):
        if self.pk and AdministrationEvent.objects.filter(pk=self.pk).exists():
            raise ValidationError("Administration events are immutable; create a correction event instead.")
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Administration events cannot be deleted.")
