PROJECT=blocks

python generate_manifest.py $PROJECT.mf
scp $PROJECT.html masharpe@math.uwaterloo.ca:public_html/$PROJECT.html
scp $PROJECT.mf masharpe@math.uwaterloo.ca:public_html/$PROJECT.mf
ssh masharpe@math.uwaterloo.ca "cd public_html; chmod a+rx $PROJECT.*"
