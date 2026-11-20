from pymongo import MongoClient
uri = "mongodb+srv://Rishi2001:Rishi1202@cluster0.5oz7uax.mongodb.net/Shop_db?retryWrites=true&w=majority"
client = MongoClient(uri)

db=client.Shop_db
collection=db.get_collection("items")
user_Collection=db.get_collection("user")
cart_Collection=db.get_collection("carts")
order_Collection=db.get_collection("orders")
carousel_Collection=db.get_collection("carousel_images")




