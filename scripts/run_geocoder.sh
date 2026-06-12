#!/bin/bash
cd /root/tresycuarto-sync
# Credenciales fuera del repo (token master). Ver /root/.tresycuarto_env
source /root/.tresycuarto_env
/usr/bin/python3 scripts/geocoder.py >> logs/geocoder.log 2>&1
