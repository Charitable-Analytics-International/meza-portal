# import basic libs
import os
import sys

# set name
package_name = 'meza-initiator'

# append path to decoder
sys.path.append(os.path.abspath(os.path.join(package_name)))

# import decoder
import meza_initiator

# check args
try:
    path = sys.argv[1]
except:
    raise Exception("error while loading argument")

# run 
outpath = meza_initiator.run(path)

# print result to stdout
if outpath is None or type(outpath) != str or len(outpath) == 0:
    print('')
else:
    print(outpath)
