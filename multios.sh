#!/bin/bash

yum --help &> /dev/null

if [ $? -eq 0 ] 
then
    echo "=========Running CentOS Configuration For HTTPD==============="
    
    sudo yum install httpd wget unzip -y
    sudo systemctl enable httpd
    sudo systemctl start httpd
    sudo mkdir -p /tmp/httpd/
    cd /tmp/httpd/
    wget https://www.tooplate.com/zip-templates/2156_graphite_creative.zip
    unzip 2156_graphite_creative.zip
    
    sudo cp -r 2156_graphite_creative/* /var/www/html/
    sudo rm -rf /tmp/httpd/
    sudo systemctl restart httpd
    sudo systemctl status httpd
else
    echo "=========Running Ubuntu Configuration For HTTPD==============="
    
    sudo apt-get update
    sudo apt-get install apache2 wget unzip -y
    sudo systemctl enable apache2
    sudo systemctl start apache2
    sudo mkdir -p /tmp/apache2/
    cd /tmp/apache2/
    wget https://www.tooplate.com/zip-templates/2156_graphite_creative.zip
    unzip 2156_graphite_creative.zip
    
    sudo cp -r 2156_graphite_creative/* /var/www/html/
    sudo rm -rf /tmp/apache2/
    sudo systemctl restart apache2
    sudo systemctl status apache2
fi
