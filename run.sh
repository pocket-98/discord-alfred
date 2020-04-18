#!/bin/bash
home=$HOME
cd $home
node index.js |& tee log.txt
