import requests
import os
from django.http import StreamingHttpResponse

def asset_proxy_middleware(next):
    def middleware(request):
        # Only proxy requests for static assets (i.e. paths starting with /static)
        # and only if an ASSET_URL is configured. Do NOT proxy /media requests. 
        # Adjusted by Copilot to help me get images to display, seems like it was a problem with the middleware afterall. 
        asset_url = os.environ.get('ASSET_URL')
        if asset_url and request.path.startswith('/static'):
            # Proxy request to asset server (strip the /static prefix)
            target = f"{asset_url}{request.path.replace('/static', '')}"
            response = requests.get(target, stream=True)

            # Stream response
            return StreamingHttpResponse(
                response.raw,
                content_type=response.headers.get('content-type'),
                status=response.status_code,
                reason=response.reason
            )

        # call next middleware
        return next(request)

    return middleware