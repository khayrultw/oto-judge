#!/bin/bash

if [[ $1 == *.py ]]
then
    python3 $1 <<< $2
elif [[ $1 == *.kt ]]
then 
    kotlinc $1 -include-runtime -d judge/a.jar
    java -jar judge/a.jar <<< $2
elif [[ $1 == *.js ]]
then
    node $1 <<< $2
fi