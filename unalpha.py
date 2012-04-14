import re
import sys

# Note: observed alpha is possibly 0xC7.
# Original value has been lost.
if len(sys.argv) != 3:
  print 'Usage: python unalpha.py alpha colour'
  sys.exit(1)

def parse_colour(s):
  m = re.match(r'#(..)(..)(..)', s)
  assert m
  c = tuple([int(m.group(i), 16) for i in [1,2,3]])
  return c

alpha = int(sys.argv[1], 16)/255.
c_in = parse_colour(sys.argv[2])
c_out = tuple([int((y - (1-alpha)*255.)/alpha) for y in c_in])

def fmt_colour(c):
  return '#%02x%02x%02x' % c

print 'alpha = ', alpha
print 'c_in = ', fmt_colour(c_in)
print 'c_out = ', fmt_colour(c_out)
print

rgba = 'rgba(%d, %d, %d, %.2lf)' % (c_out + (alpha,))
print rgba
