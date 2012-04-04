scp $1 masharpe@math.uwaterloo.ca:public_html/$1
scp $1 masharpe@math.uwaterloo.ca:public_html/dev/$1
ssh masharpe@math.uwaterloo.ca "cd public_html; chmod a+rx $1"
ssh masharpe@math.uwaterloo.ca "cd public_html; cd dev; chmod a+rx $1"
