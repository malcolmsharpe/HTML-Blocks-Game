PROJECT=blocks
SRCS="$PROJECT.html $PROJECT.js $PROJECT.mf"
DEST=masharpe@math.uwaterloo.ca:public_html/dev/

python generate_manifest.py $PROJECT.mf
rsync --perms --progress $SRCS $DEST
