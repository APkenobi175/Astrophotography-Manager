import base64
import json
import os

import requests
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from .models import Session, SessionLike, SessionImage
from django.conf import settings
from django.views.decorators.http import require_POST

from django.shortcuts import get_object_or_404

# Load manifest when server launches
MANIFEST = {}
if not settings.DEBUG:
    with open(f"{settings.BASE_DIR}/core/static/core/manifest.json") as f:
        MANIFEST = json.load(f)

#Create your views here.
@login_required
def index(req):
    context = {
        "asset_url": os.environ.get("ASSET_URL", ""),
        "debug": settings.DEBUG,
        "manifest": MANIFEST,
        # When DEBUG, Vite dev server serves JS/CSS; template ignores these.
        "js_file": "" if settings.DEBUG else MANIFEST["src/main.jsx"]["file"],
        "css_file": "" if settings.DEBUG else MANIFEST["src/main.jsx"]["css"][0],
    }
    return render(req, "core/index.html", context)


@login_required
def current_user(request):
    """Return basic info about the currently authenticated user."""
    u = request.user
    return JsonResponse({
        "firstName": u.first_name,
        "lastName": u.last_name,
        "username": u.username,
    })


# this handles /api/sessions/ for GET and POST
@login_required
@require_http_methods(["GET", "POST"])
def sessions_collection(request):
    if request.method == "GET":
        sessions = Session.objects.filter(user=request.user).order_by("-created_at")
        # Get image URLS for each session
        def _images_for_session(req, sess):
            imgs = []
            for im in sess.images.all():
                # Return relative media path so dev server can proxy /media
                imgs.append(im.image.url)
            return imgs

        # big ol list comprehension
        data = [
            {
                "id": s.id,
                "title": s.title,
                "target": s.target,
                "datetimeStart": s.datetime_start.isoformat(),
                "locationName": s.location_name,
                "lightFrames": s.light_frames,
                "lightExposureSeconds": s.light_exposure_seconds,
                "iso": s.iso,
                "cameraModel": s.camera_model,
                "telescopeOrLens": s.telescope_or_lens,
                "isPublic": s.is_public,
                "caption": s.caption,
                "ownerName": (f"{s.user.first_name or ''} {s.user.last_name or ''}".strip() or s.user.username),
                "ownerUsername": s.user.username,
                "postCreationDate": s.post_creation_date.isoformat(),
                "likeCount": s.likes.count(),
                "likedByCurrentUser": s.likes.filter(user=request.user).exists(),
                "images": _images_for_session(request, s),
            }
            for s in sessions
        ]

        return JsonResponse({"sessions": data})

    # POST: create a new session
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    title = body.get("title", "").strip()
    target = body.get("target", "").strip()
    datetime_start_raw = body.get("datetimeStart")
    location_name = body.get("locationName", "").strip()
    light_frames = body.get("lightFrames") or 0
    light_exposure_seconds = body.get("lightExposureSeconds") or 0
    iso = body.get("iso")
    camera_model = body.get("cameraModel", "").strip()
    telescope_or_lens = body.get("telescopeOrLens", "").strip()
    is_public = bool(body.get("isPublic", False))
    caption = body.get("caption", "").strip()
 #    created_at = body.get("createdAt")
 #   post_creation_date = body.get("postCreationDate")

    # if any required fields are missing, return 400
    if (
        not title
        or not target
        or not datetime_start_raw
        or not location_name
        or not camera_model
        or not telescope_or_lens
    ):
        return JsonResponse({"error": "Missing required fields"}, status=400)
     # parse datetime
    dt_start = parse_datetime(datetime_start_raw)
    if dt_start is None:
        return JsonResponse({"error": "Invalid datetimeStart format"}, status=400)
     # validate numeric fields
    try:
        light_frames = int(light_frames)
        light_exposure_seconds = int(light_exposure_seconds)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Invalid numeric fields"}, status=400)
     # create a session
    session = Session.objects.create(
        user=request.user,
        title=title,
        target=target,
        datetime_start=dt_start,
        location_name=location_name,
        light_frames=light_frames,
        light_exposure_seconds=light_exposure_seconds,
        iso=iso,
        camera_model=camera_model,
        telescope_or_lens=telescope_or_lens,
        caption=caption,
        is_public=is_public,
    )
    # return the created session and its data
    data = {
        "id": session.id,
        "title": session.title,
        "target": session.target,
        "datetimeStart": session.datetime_start.isoformat(),
        "locationName": session.location_name,
        "lightFrames": session.light_frames,
        "lightExposureSeconds": session.light_exposure_seconds,
        "iso": session.iso,
        "cameraModel": session.camera_model,
        "telescopeOrLens": session.telescope_or_lens,
        "isPublic": session.is_public,
        "caption": session.caption,
        "ownerName": (f"{session.user.first_name or ''} {session.user.last_name or ''}".strip() or session.user.username),
        "ownerUsername": session.user.username,
        "postCreationDate": session.post_creation_date.isoformat(),
        "images": [],
    }

    return JsonResponse(data, status=201)

# this handles /api/sessions/<session_id>/ for GET, PUT, DELETE
@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def session_detail(request, session_id):
    try:
        s = Session.objects.get(id=session_id)
    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found"}, status=404)

    if request.method == "DELETE":
        if s.user != request.user:
            return JsonResponse({"error": "Forbidden"}, status=403)
        s.delete()
        return JsonResponse({"deleted": True})

    if request.method == "PUT":
        if s.user != request.user:
            return JsonResponse({"error": "Forbidden"}, status=403)
        try:
            body = json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        title = body.get("title", s.title).strip()
        target = body.get("target", s.target).strip()
        datetime_start_raw = body.get("datetimeStart")
        location_name = body.get("locationName", s.location_name).strip()
        light_frames = body.get("lightFrames", s.light_frames)
        light_exposure_seconds = body.get("lightExposureSeconds", s.light_exposure_seconds)
        iso = body.get("iso", s.iso)
        camera_model = body.get("cameraModel", s.camera_model).strip()
        telescope_or_lens = body.get("telescopeOrLens", s.telescope_or_lens).strip()
        is_public = bool(body.get("isPublic", s.is_public))
        caption = body.get("caption", s.caption).strip()

        if not title or not target or not location_name or not camera_model or not telescope_or_lens:
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if datetime_start_raw:
            dt_start = parse_datetime(datetime_start_raw)
            if dt_start is None:
                return JsonResponse({"error": "Invalid datetimeStart format"}, status=400)
            s.datetime_start = dt_start

        try:
            light_frames = int(light_frames)
            light_exposure_seconds = int(light_exposure_seconds)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Invalid numeric fields"}, status=400)

        s.title = title
        s.target = target
        s.location_name = location_name
        s.light_frames = light_frames
        s.light_exposure_seconds = light_exposure_seconds
        s.iso = iso
        s.camera_model = camera_model
        s.telescope_or_lens = telescope_or_lens
        s.is_public = is_public
        s.caption = caption
        s.save()

    if s.user != request.user and not s.is_public:
        return JsonResponse({"error": "Forbidden"}, status=403)

    data = {
        "id": s.id,
        "title": s.title,
        "target": s.target,
        "datetimeStart": s.datetime_start.isoformat(),
        "locationName": s.location_name,
        "lightFrames": s.light_frames,
        "lightExposureSeconds": s.light_exposure_seconds,
        "iso": s.iso,
        "cameraModel": s.camera_model,
        "telescopeOrLens": s.telescope_or_lens,
        "isPublic": s.is_public,
        "caption": s.caption,
        "ownerName": (f"{s.user.first_name or ''} {s.user.last_name or ''}".strip() or s.user.username),
        "ownerUsername": s.user.username,
        "postCreationDate": s.post_creation_date.isoformat(),
        "likeCount": s.likes.count(),
        "likedByCurrentUser": s.likes.filter(user=request.user).exists(),
        "images": [img.image.url for img in s.images.all()],
    }

    return JsonResponse(data)

# this handles /api/targets/search/ for GET
# I am using csrf_exempt here in an attempt to fix the issues with the AstronomyAPI requests
# I keep getting access denied, so trying this as a workaround to see if the middleware is interfering
# I don't think it is, but worth a shot.
# @csrf_exempt
@login_required
@require_GET
def search_targets(request):
    # 
    query = request.GET.get("q", "").strip()
    if len(query) < 2: # onlt search if 2 or more characters
        return JsonResponse({"results": []})

    app_id = os.environ.get("ASTRONOMY_API_ID")
    app_secret = os.environ.get("ASTRONOMY_API_SECRET")

    # hardcode working keys because for whatever reason I cannot get it to work, its not too big of a deal since these aren't super duper secret
    # and its just for an assignment, but if I can find a better way later I will un hardcode them (not pushing to github btw)

    #app_id = "e0d506c7-d7a3-41ce-baef-c258339353c5"
    #app_secret = "d8ddcb89652396397dd9987936b98268350ba2a9ab967074ec97c68b1f5fcf87545b0b19a8511664ed5efd5f76f65549a5ba10dac14a6603b104018a5a1e8a1f9f62d35f815ec029e9d3341c210661ec1dc6878401e19c90639e44626ae3858420ecf772623eb4f8fe09c6d10ef43eca"

    if not app_id or not app_secret:
        print("Astronomy API keys missing")
        return JsonResponse({"results": []})

    # tested this in repl with hardcoded keys and it worked, so putting it here should work too, maybe no more error 403s
    auth = base64.b64encode(f"{app_id}:{app_secret}".encode()).decode()
    # Ask the remote server to close the connection when done and ensure
    # we explicitly close the Response to avoid accumulating open sockets
    headers = {"Authorization": f"Basic {auth}", "Connection": "close"}
    # params for the search with the AstronomyAPI
    params = {
        "term": query,
        "match_type": "fuzzy",
        "limit": "5",
        "order_by": "name",
    }
    # Alrighty here we go, make the request
    resp = None
    try:
        resp = requests.get(
            "https://api.astronomyapi.com/api/v2/search",
            headers=headers,
            params=params,
            timeout=5,
        )
    except requests.RequestException as e:
        print("AstronomyAPI request failed:", e)
        if resp is not None:
            try:
                resp.close()
            except Exception:
                pass
        return JsonResponse({"results": []})

    # check the response status
    if resp.status_code != 200:
        # Log for debugging
        txt = ""
        try:
            txt = resp.text[:200]
        except Exception:
            pass
        print("AstronomyAPI returned", resp.status_code, txt)
        try:
            resp.close()
        except Exception:
            pass
        return JsonResponse({"results": []})

    try:
        payload = resp.json()
    finally:
        try:
            resp.close()
        except Exception:
            pass
    data = payload.get("data", [])

    results = []
    for obj in data:
        name = obj.get("name")
        obj_type = obj.get("type", {}).get("name")
        cross_ids = obj.get("crossIdentification", []) or []

        preferred = None
        for cid in cross_ids:
            cat_id = cid.get("catalogId")
            if cat_id in ("M", "NGC"):
                preferred = cid
                break
        # Change the format for how its displayed I want to see something like "M42 - Orion Nebula"
        if preferred:
            raw_short = preferred.get("name") or ""   # e.g. "M 42"
            short_clean = raw_short.replace(" ", "")  # "M42"
            display = f"{short_clean} - {name}"       # "M42 - Orion Nebula" This is the format I want the targets to be displayed in
            short_name = short_clean
        else:
            display = name
            short_name = name


        results.append(
            {
                "id": obj.get("id"),
                "name": name,
                "shortName": short_name,
                "display": display,
                "type": obj_type,
            }
        )
    # return the json response
    return JsonResponse({"results": results})

# this handles /api/sessions/public/ for GET, I want to have a social media style feed of public sessions
@login_required
@require_GET
def public_sessions(request):
# Get a list of recent public sessions across all users, cap at 50
    sessions = (
        Session.objects.filter(is_public=True)
        .select_related("user")
        .order_by("-created_at")[:50]   # cap the feed
    )
    # init data array
    data = []
    for s in sessions:
        total_integration = 0
        if s.light_frames and s.light_exposure_seconds:
            total_integration = s.light_frames * s.light_exposure_seconds

        owner_name = (f"{s.user.first_name or ''} {s.user.last_name or ''}".strip() or s.user.username)

        data.append(
            {
                "id": s.id,
                "title": s.title,
                "target": s.target,
                "datetimeStart": s.datetime_start.isoformat(),
                "locationName": s.location_name,
                "lightFrames": s.light_frames,
                "lightExposureSeconds": s.light_exposure_seconds,
                "totalIntegrationSeconds": total_integration,
                "iso": s.iso,
                "cameraModel": s.camera_model,
                "telescopeOrLens": s.telescope_or_lens,
                "isPublic": s.is_public,
                "caption": s.caption,
                "ownerName": owner_name,
                "ownerUsername": s.user.username.split("@")[0],
                "postCreationDate": s.post_creation_date.isoformat(),
                "likeCount": s.likes.count(),
                "likedByCurrentUser": s.likes.filter(user=request.user).exists(),
                "images": [img.image.url for img in s.images.all()],
            }
        )

    return JsonResponse({"sessions": data})

@login_required
@require_http_methods(["POST"])
def toggle_session_like(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    like, created = SessionLike.objects.get_or_create(user=request.user, session=session)
    if not created:
        # Like already exists, so remove it (unlike)
        like.delete()
        liked = False
    else:
        liked = True

    like_count = session.likes.count()
    return JsonResponse({"liked": liked, "likeCount": like_count})


@login_required
@require_POST
def upload_session_images(request, session_id):
    # Upload images for a session
    # get the session or return 404
    session = get_object_or_404(Session, id=session_id)
    if session.user != request.user:
        return JsonResponse({"error": "Forbidden"}, status=403)
    # Get the files from the request
    files = request.FILES.getlist("images")
    print("FILES:", request.FILES)
    print("FILES keys:", list(request.FILES.keys()))
    if not files:
        return JsonResponse({"error": "No files provided"}, status=400)
    # Limiting to max 3 images per upload
    if len(files) > 3:
        return JsonResponse({"error": "Maximum 3 images allowed"}, status=400)

    saved = []
    MAX_BYTES = 50 * 1024 * 1024  # 50 MB per file
    ALLOWED_EXT = (".jpg", ".jpeg", ".png") # No RAW FILES allowed

    for f in files:
        # Check if the file is allowed
        name = f.name.lower()
        if not name.endswith(ALLOWED_EXT):
            return JsonResponse({"error": "Invalid file type"}, status=400)
        if f.size > MAX_BYTES:
            return JsonResponse({"error": "File too large"}, status=400)

        img = SessionImage(session=session, image=f)
        img.save()
        # Return relative media path; frontend will POST to /media via Vite proxy in dev
        saved.append({"id": img.id, "url": img.image.url})

    return JsonResponse({"images": saved}, status=201)

# A seperate feed for all the user's own liked sessions
@login_required
@require_GET
def liked_sessions(request):

    likes = (
        SessionLike.objects.filter(user=request.user)
        .select_related("session", "session__user")
        .order_by("-created_at")
    )

    data = []
    for like in likes:
        s = like.session

        total_integration = 0
        if s.light_frames and s.light_exposure_seconds:
            total_integration = s.light_frames * s.light_exposure_seconds

        owner_name = (f"{s.user.first_name or ''} {s.user.last_name or ''}".strip() or s.user.username)
        username_clean = s.user.username.split("@")[0]

        data.append(
            {
                "id": s.id,
                "title": s.title,
                "target": s.target,
                "datetimeStart": s.datetime_start.isoformat(),
                "locationName": s.location_name,
                "lightFrames": s.light_frames,
                "lightExposureSeconds": s.light_exposure_seconds,
                "totalIntegrationSeconds": total_integration,
                "iso": s.iso,
                "cameraModel": s.camera_model,
                "telescopeOrLens": s.telescope_or_lens,
                "isPublic": s.is_public,
                "caption": s.caption,
                "ownerName": owner_name,
                "ownerUsername": username_clean,
                "postCreationDate": s.post_creation_date.isoformat(),
                "likeCount": s.likes.count(),
                "likedByCurrentUser": True,  # duh 
                "images": [img.image.url for img in s.images.all()],
            }
        )

    return JsonResponse({"sessions": data})
