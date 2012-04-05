PROJECT=blocks
SRCS=`cat $PROJECT.mf.raw | xargs echo $PROJECT.mf`
DEST=masharpe@math.uwaterloo.ca:public_html/dev/

python generate_manifest.py $PROJECT.mf
rsync --perms --progress $SRCS $DEST
