#!/bin/bash
cd /root/tresycuarto-sync
export CLOUDFLARE_API_TOKEN=KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix
export CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
/usr/bin/python3 scripts/geocoder.py >> logs/geocoder.log 2>&1
