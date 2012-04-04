import hashlib
import sys

if len(sys.argv) != 2:
  print 'Usage: python generate_manifest.py project.mf'
  sys.exit(1)

mf = sys.argv[1]

f = file(mf, 'w')

print >>f, 'CACHE MANIFEST'

def checkpoint_file(name):
  h = hashlib.sha256()
  h.update(file(name, 'rb').read())
  print >>f
  print >>f, '#', h.hexdigest()
  print >>f, name

for line in file(mf + '.raw'):
  checkpoint_file(line.strip())
