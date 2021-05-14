FROM 774389645446.dkr.ecr.ap-southeast-2.amazonaws.com/base-image-app:latest as build

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
#RUN npm audit fix --force
#RUN npm run-script build
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
ADD . /usr/src/app

RUN pwd

#EXPOSE 8080
#EXPOSE 3000
ENV NODE_ENV staging
CMD [ "npm", "start" ]
