FROM mhart/alpine-node

WORKDIR /src
ADD . .

RUN npm install

EXPOSE 9797
CMD ["node", "index.js"]
