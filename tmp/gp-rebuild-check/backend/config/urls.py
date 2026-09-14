from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from apps.administration.views import AdministrationEventViewSet
from apps.clients.views import ClientViewSet, HomeViewSet
from apps.medications.views import MedicationOrderViewSet
from apps.messaging.views import ChartMessageViewSet

router = DefaultRouter()
router.register("homes", HomeViewSet, basename="home")
router.register("clients", ClientViewSet, basename="client")
router.register("medication-orders", MedicationOrderViewSet, basename="medication-order")
router.register("administrations", AdministrationEventViewSet, basename="administration")
router.register("messages", ChartMessageViewSet, basename="chart-message")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
