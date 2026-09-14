import uuid
from django.conf import settings
from django.db import models


class ChartMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey("clients.Client", related_name="chart_messages", on_delete=models.PROTECT)
    medication_order = models.ForeignKey("medications.MedicationOrder", null=True, blank=True, related_name="messages", on_delete=models.PROTECT)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    recipient_type = models.CharField(max_length=30, choices=[("PHARMACY", "Pharmacy"), ("PRESCRIBER", "Prescriber"), ("CARE_TEAM", "Care team")])
    subject = models.CharField(max_length=200)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
