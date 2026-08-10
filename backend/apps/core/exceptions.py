import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('django.request')


def api_exception_handler(exc, context):
    """
    Wraps DRF's default handler so every error response has a
    consistent shape: {"detail": "...", "errors": {...optional...}}.
    Unhandled (500-class) exceptions never surface their message or
    traceback to the client — they're logged server-side and the
    client gets a generic message instead.
    """
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        if isinstance(data, dict) and 'detail' in data and len(data) == 1:
            response.data = {'detail': data['detail']}
        else:
            response.data = {'detail': 'Request failed.', 'errors': data}
        return response

    # Unhandled exception — log full detail server-side, return a safe generic message.
    logger.exception('Unhandled exception in API view', exc_info=exc)
    return Response(
        {'detail': 'An unexpected error occurred. Please try again.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
