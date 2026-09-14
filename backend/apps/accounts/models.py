from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        RN = "RN", "Registered nurse"
        CARER = "CARER", "Support worker / carer"
        COORDINATOR = "COORDINATOR", "Coordinator"
        MANAGEMENT = "MANAGEMENT", "Group home management"
        GP = "GP", "General practitioner"
        PHARMACIST = "PHARMACIST", "Pharmacist"
        ADMIN = "ADMIN", "Administrator"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CARER)
    mfa_enabled = models.BooleanField(default=False)
    organisation = models.ForeignKey("clients.Organisation", null=True, blank=True, on_delete=models.PROTECT)

    @property
    def requires_mfa(self):
        return self.role in {self.Role.RN, self.Role.GP, self.Role.MANAGEMENT, self.Role.ADMIN}
