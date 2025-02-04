# import basic libs
import os
import sys

# set name
package_name = 'meza-contour'

# append path to decoder
sys.path.append(os.path.abspath(os.path.join(package_name)))

# import decoder
import meza_contour

# check args
try:
    path = sys.argv[1]
    outpath = sys.argv[2]
except:
    raise Exception("error while loading argument")

# run 
results = meza_contour.run(path, json_outpath=outpath)

# print result to stdout
if results is None or type(results) != dict:
    print('')
else:
    print(outpath)
