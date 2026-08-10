from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


def _role_of(user):
    if user.is_staff:
        return 'admin'
    if hasattr(user, 'agent_profile'):
        return 'agent'
    return 'public'


def _serialize_user(user):
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': _role_of(user),
    }
    if hasattr(user, 'agent_profile'):
        a = user.agent_profile
        data['agent'] = {
            'id': a.id, 'name': a.name, 'region': a.region, 'district': a.district,
            'status': a.status, 'avatar_url': a.avatar_url,
        }
    if user.is_staff:
        profile = getattr(user, 'staff_profile', None)
        data['staff'] = {
            'display_name': profile.name if profile else (user.get_full_name() or user.username),
            'avatar_url': profile.avatar_url if profile else None,
        }
    return data


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def login_view(request):
    """
    POST { username, password } -> { access, refresh, user }.
    No client-asserted "role" is trusted at all — the server determines
    the role from the authenticated User object itself.
    """
    login_view.throttle_scope = 'auth'
    from django.contrib.auth import authenticate

    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    if not username or not password:
        return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({'detail': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_staff:
        agent = getattr(user, 'agent_profile', None)
        if agent and agent.status != 'active':
            return Response({'detail': 'This account has been deactivated. Contact your administrator.'},
                             status=status.HTTP_403_FORBIDDEN)
        if agent:
            agent.last_seen = timezone.now()
            agent.save(update_fields=['last_seen'])

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': _serialize_user(user),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """POST { refresh } -> blacklists the refresh token."""
    try:
        token = RefreshToken(request.data.get('refresh', ''))
        token.blacklist()
    except TokenError:
        pass
    return Response({'detail': 'Logged out.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(_serialize_user(request.user))
