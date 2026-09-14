import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class MedicationOrder(models.Model):
    """Prescribed order with all 8 Rights represented explicitly."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        CEASED = "CEASED", "Ceased"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey("clients.Client", related_name="medication_orders", on_delete=models.PROTECT)
    drug = models.CharField(max_length=200)
    dose = models.CharField(max_length=100)
    route = models.CharField(max_length=100)
    scheduled_time = models.TimeField()
    documentation_instructions = models.TextField()
    reason = models.TextField()
    expected_response = models.TextField()
    prn = models.BooleanField(default=False)
    prn_protocol = models.TextField(blank=True)
    prescriber = models.CharField(max_length=200)
    starts_on = models.DateField()
    ends_on = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        required_rights = [self.patient_id, self.drug, self.dose, self.route, self.scheduled_time, self.documentation_instructions, self.reason, self.expected_response]
        if not all(required_rights):
            raise ValidationError("All eight medication rights must be documented.")
        if self.prn and not self.prn_protocol.strip():
            raise ValidationError({"prn_protocol": "A PRN protocol is required for PRN medication."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
