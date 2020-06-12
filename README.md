## requirment

* node.js >= 14.0.0
* mysql

## usage

init database with `/faas-runtime/database.sql`

```
cd faas-runtime && npm install

npm start
```

## demo

### deploy function

path: `localhost:8080/serverless-runtime/api/deploy`
method: `PUT`
params:

```json
{
	"service": "faas-demo-service",
	"version": "1.0.0"
}
```

### execute function

path: `localhost:8080/serverless-runtime/fn/faas-demo-service/foo`
method: `GET`

you got it

```json
{
    "code": 0,
    "data": "Your function executed successfully!"
}
```