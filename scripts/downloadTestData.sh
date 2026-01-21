#!/bin/bash
mkdir -p ./testdata
cd ./testdata
wget -O 1.3.6.1.4.1.9328.50.2.128367.zip "https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage?SeriesInstanceUID=1.3.6.1.4.1.9328.50.2.128367"
wget -O 1.3.6.1.4.1.9328.50.2.126606.zip "https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage?SeriesInstanceUID=1.3.6.1.4.1.9328.50.2.126606"
for f in *.zip; do unzip "$f" -d "${f%.zip}"; done && rm *.zip