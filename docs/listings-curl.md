# Owner Listings API — Sample cURL commands

Base URL (dev): `http://localhost:4000`  
Auth: `Authorization: Bearer <accessToken>` from `POST /auth/login` or OTP verify.

## Create listing (JSON)

```bash
curl -X POST http://localhost:4000/listings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "listingKind": "licensed",
    "purpose": "rent",
    "propertyType": "Apartment",
    "city": "Juffair",
    "district": "Block 123",
    "address": "Street 45",
    "price": 65000,
    "premiumPeriod": "yearly",
    "area": 120,
    "bedrooms": "3",
    "livingRooms": "1",
    "wc": "2",
    "floor": "Ground",
    "ageLessThan": "New",
    "occupantType": "family",
    "furnished": true,
    "airConditioned": true,
    "description": "Spacious apartment in Juffair",
    "contactPhone": "+97312345678",
    "allowInquiries": true
  }'
```

## Create listing with photos (multipart)

```bash
curl -X POST http://localhost:4000/listings \
  -H "Authorization: Bearer <token>" \
  -F "listingKind=licensed" \
  -F "purpose=rent" \
  -F "propertyType=Apartment" \
  -F "city=Juffair" \
  -F "district=Block 123" \
  -F "price=65000" \
  -F "premiumPeriod=yearly" \
  -F "area=120" \
  -F "bedrooms=3" \
  -F "livingRooms=1" \
  -F "wc=2" \
  -F "floor=Ground" \
  -F "ageLessThan=New" \
  -F "occupantType=family" \
  -F "description=Spacious apartment in Juffair" \
  -F "contactPhone=+97312345678" \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.webp"
```

## List public listings (homepage — no auth)

Query parameters (all optional; omit or pass `all` to show everything in that dimension):

| Parameter | Values | Example |
|-----------|--------|---------|
| `purpose` | `all`, `rent`, `sale` | `purpose=rent` |
| `propertyType` | `all`, `apartments`, `lands`, `villas`, `floors`, `commercial-offices`, `farms`, `rest-houses`, or exact type e.g. `Apartment` | `propertyType=villas` |
| `city` | `all`, or `Juffair`, `Seef`, `Saar`, `Busaiteen`, `Hidd` | `city=Juffair` |
| `page` | integer (default 1) | `page=1` |
| `limit` | integer (default 12, max 50) | `limit=12` |
| `sort` | `-createdAt`, `price`, `-price`, etc. | `sort=-createdAt` |

```bash
# All listings
curl -X GET "http://localhost:4000/listings/public?page=1&limit=12&sort=-createdAt"

# Rent only, villas in Juffair
curl -X GET "http://localhost:4000/listings/public?purpose=rent&propertyType=villas&city=Juffair"

# Sale only, commercial offices
curl -X GET "http://localhost:4000/listings/public?purpose=sale&propertyType=commercial-offices"
```

## Get single public listing (property detail page — no auth)

```bash
curl -X GET http://localhost:4000/listings/public/clx123abc
```

## List my listings

```bash
curl -X GET "http://localhost:4000/listings?page=1&limit=10&purpose=rent&status=active&sort=-createdAt" \
  -H "Authorization: Bearer <token>"
```

## Get single listing

```bash
curl -X GET http://localhost:4000/listings/clx123abc \
  -H "Authorization: Bearer <token>"
```

## Update listing (partial)

```bash
curl -X PATCH http://localhost:4000/listings/clx123abc \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "price": 70000 }'
```

## Soft-delete listing

```bash
curl -X DELETE http://localhost:4000/listings/clx123abc \
  -H "Authorization: Bearer <token>"
```

## Upload photos to existing listing

```bash
curl -X POST http://localhost:4000/listings/clx123abc/photos \
  -H "Authorization: Bearer <token>" \
  -F "photos=@/path/to/photo3.png"
```

## Delete one photo

```bash
curl -X DELETE http://localhost:4000/listings/clx123abc/photos/p1 \
  -H "Authorization: Bearer <token>"
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTING_PHOTO_MAX_BYTES` | `5242880` (5 MB) | Max size per photo |
| `LISTING_PHOTO_UPLOAD_DIR` | `public/uploads/listings` | Local storage directory |
| `LISTING_PHOTO_PUBLIC_BASE_URL` | request host | Public URL prefix for photo URLs |

Run migrations before first use:

```bash
npm run db:migrate
```
