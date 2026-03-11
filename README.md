# Plate Layout Tool

## Overview
Plate Layout Tool is a research-focused web application for planning sample transfer from a **96-well PCR plate** to **24-lane gel electrophoresis**.

In molecular biology workflows, arranging samples for gel loading is time-consuming and error-prone, especially when using an **8-channel pipette**. This tool automates layout planning and step ordering to improve reproducibility and reduce setup mistakes.

## Features
- Upload sample list (`txt` / `csv`)
- Automatic 24-well gel lane layout generation
- 96-well plate planning view
- Pipetting step instructions for 8-channel workflows
- Multi-gel / multi-plate support
- CSV export for downstream documentation

## Installation
```bash
git clone <repository-url>
cd plate-layout-tool
npm install
```

## Running locally
```bash
npm run dev
```

Vite development server runs on:
- `http://localhost:5173`

## Running with Docker
Build image:
```bash
docker build -t plate-layout-tool .
```

Run container:
```bash
docker run -p 5173:5173 plate-layout-tool
```

Then open:
- `http://localhost:5173`

## Usage
1. Upload sample list (`txt` or `csv`)
2. Select marker placement option
3. Click **Generate**
4. Review gel/plate layout and export CSV

## Input format
Basic line-by-line format:
```text
sample1
sample2
sample3
```

CSV-style format is also supported (first column is used):
```text
sample_name
sample1
sample2
```

## Output
The tool generates:
- Gel layout (24-lane assignment)
- Plate layout (96-well mapping)
- Pipetting steps (8-channel-oriented sequence)
- CSV export files

## Future improvements
- Printable experiment report templates
- User-defined plate/gel templates
- Enhanced validation for large batch inputs
- Optional LIMS-friendly export formats

## License
MIT License
