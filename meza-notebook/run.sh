#!/bin/bash

# Start the Jupyter Notebook with the hashed password
python3 -m notebook --no-browser --port=8085 --notebook-dir=./workdir/ --NotebookApp.allow_origin='*' --NotebookApp.base_url=/api/notebook --NotebookApp.token='' --NotebookApp.password='' --NotebookApp.ip='127.0.0.1'
