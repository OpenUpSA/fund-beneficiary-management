# Fund Beneficiary Management

Flexible, open source management software for fund managers. Built for [SCAT](https://scat.org.za) by [OpenUp](https://openup.org.za) but usable by anyone.

## Deployment

Netlify automatically deploys `main` branch.

## Development

```
yarn install
docker compose up
yarn db:migrate
yarn db:seed
yarn dev
```

Visit http://localhost:3000

## Customisation

Cutomise the following files to your organisation's needs:
```
app/favicon.ico
messages/{locale}.json
public/images/*.webp
```

