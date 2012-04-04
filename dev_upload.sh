PROJECT=blocks

python generate_manifest.py $PROJECT.mf
scp $PROJECT.html masharpe@math.uwaterloo.ca:public_html/dev/$PROJECT.html
scp $PROJECT.mf masharpe@math.uwaterloo.ca:public_html/dev/$PROJECT.mf
ssh masharpe@math.uwaterloo.ca "cd public_html; cd dev; chmod a+rx $PROJECT.*"
