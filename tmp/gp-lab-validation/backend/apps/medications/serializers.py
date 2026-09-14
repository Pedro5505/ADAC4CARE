from rest_framework import serializers
from .models import MedicationOrder


class MedicationOrderSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = MedicationOrder
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
