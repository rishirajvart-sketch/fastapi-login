from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Body, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import hashlib
import bcrypt
from jose import JWTError, jwt
from urllib.parse import urlparse
from database import collection, user_Collection, cart_Collection, order_Collection, carousel_Collection
from models import *



SECRET_KEY = "7f37e394715aa28d1a7c315526525a501b08c7b49e8997e1a81f70189b4fc9f7"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI(title="creates supermarket")

@app.on_event("startup")
def ensure_user_username_is_unique():
    user_Collection.create_index("username", unique=True)
    cart_Collection.create_index("user_id", unique=True)
    order_Collection.create_index([("user_id", 1), ("created_at", -1)])


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return plain_password == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()    
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if subject is None:
            raise credentials_exception
        if ObjectId.is_valid(subject):
            user = user_Collection.find_one({"_id": ObjectId(subject)})
        else:
            user = user_Collection.find_one({"username": subject})
        if user is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return {
        "id": user["_id"],
        "username": user["username"],
        "role": user.get("role", "client"),
    }

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only admins can perform this action."
        )
    return current_user

@app.post("/signup/")
def Signup(user: userSchema):
    userdetail = user_Collection.find_one({"username": user.username})
    if userdetail:
       raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
       )

    hashed_password = get_password_hash(user.password)
    
    user_data = {
        "username": user.username,
        "password": hashed_password,
        "phone_number": getattr(user, "phone_number", None),
        "email": user.email,
        "age":user.age,
        "Gender": user.Gender,
        "role": "client"
    }

    try:
        new_user = user_Collection.insert_one(user_data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    added_user = user_Collection.find_one({"_id": new_user.inserted_id})

    return { 
        "message": "Signup successfully",
        "user": user_helper(added_user)
    } 


@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = user_Collection.find_one({"_id": current_user["id"]})
    return user_helper(user)


@app.post("/admin/create")
def create_admin(user: userSchema, admin_user: dict = Depends(require_admin)):
    if user_Collection.find_one({"username": user.username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    user_data = {
        "username": user.username,
        "password": get_password_hash(user.password),
        "phone_number": user.phone_number,
        "email": user.email,
        "age": user.age,
        "Gender": user.Gender,
        "role": "admin"
    }

    try:
        new_user = user_Collection.insert_one(user_data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    return {
        "message": "Admin Added successfully",
        "username": user_Collection.find_one({"_id": new_user.inserted_id})["username"]
    }


@app.get("/user/{id}")
def user_details(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )

    userdetail = user_Collection.find_one({"_id": ObjectId(id)})
    if not userdetail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_helper(userdetail)


@app.post("/login")
def Login(login: loginSchema):
    db_user = user_Collection.find_one({"username": login.username})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )


    stored_password = db_user["password"]
    if not verify_password(login.password, stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token_expire = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(db_user["_id"]),
            "username": db_user["username"],
            "role": db_user.get("role", "client"),
        },
        expires_delta=token_expire
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login Successfully",
        "role": db_user.get("role", "client"),
        "user": user_helper(db_user)
    }


@app.post("/create_item")
def create_item(item_data: item_model, admin_user: dict = Depends(require_admin)):
    add_item = item_data.dict()
    add_item["ownerid"] = admin_user["username"]
    
    new_item = collection.insert_one(add_item)
    added_item = collection.find_one({"_id": new_item.inserted_id})
    
    total_count = collection.count_documents({})
    return item_helper(added_item, serial_no=total_count)


@app.put("/update/{id}")
def update_item(id: str, item_data: ItemUpdateModel, admin_user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail='id invalid')

    objId = ObjectId(id)
    exitsid = collection.find_one({"_id": objId})
    if not exitsid:
        raise HTTPException(status_code=400, detail="there is no id to update")

    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "quantity" in update_data:
        update_data["in_stock"] = True if update_data["quantity"] > 0 else False

    collection.update_one({"_id": objId}, {"$set": update_data})
    updated_item = collection.find_one({"_id": objId})

    return {
        "status": "success",
        "message": f"Item updated successfully by admin {admin_user['username']}!",
        "item": item_helper(updated_item)
    }


@app.delete("/delete/{id}")
def delete_item(id: str, admin_user: dict = Depends(require_admin)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail='id invalid')

    objId = ObjectId(id)
    exitsid = collection.find_one({"_id": objId})
    if not exitsid:
        raise HTTPException(status_code=400, detail="there is no id to delete")

    collection.delete_one({"_id": objId})

    return {
        "status": "success",
        "message": f"Item deleted successfully by admin {admin_user['username']}!"
    }


@app.get("/carousel-images")
def get_carousel_images():
    carousel = carousel_Collection.find_one({"_id": "homepage"})
    return {"images": carousel.get("images", []) if carousel else []}


@app.put("/carousel-images")
def update_carousel_images(
    payload: CarouselImagesUpdate,
    admin_user: dict = Depends(require_admin),
):
    images = [image.strip() for image in payload.images]
    if not images or len(images) > 20:
        raise HTTPException(
            status_code=400,
            detail="Provide between 1 and 20 carousel image URLs.",
        )

    for image in images:
        parsed_url = urlparse(image)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise HTTPException(
                status_code=400,
                detail="Each carousel image must be a valid HTTP or HTTPS URL.",
            )

    carousel_Collection.update_one(
        {"_id": "homepage"},
        {"$set": {"images": images}},
        upsert=True,
    )
    return {"images": images, "message": f"Carousel updated by {admin_user['username']}."}


@app.get("/view")
def get_item():
    items = []
    for index, item in enumerate(collection.find(), start=1):
       items.append(item_helper(item, serial_no=index))
    return items


def cart_helper(user_id: ObjectId) -> dict:
    cart = cart_Collection.find_one({"user_id": user_id}) or {"items": []}
    cart_items = []
    total = 0.0
    for saved_item in cart.get("items", []):
        product = collection.find_one({"_id": saved_item["item_id"]})
        quantity = saved_item["quantity"]
        if product is None:
            cart_items.append({
                "item_id": str(saved_item["item_id"]),
                "name": "Product unavailable",
                "price": 0.0,
                "image": "",
                "quantity": quantity,
                "available": False,
                "line_total": 0.0,
            })
            continue
        line_total = float(product.get("price", 0)) * quantity
        total += line_total
        cart_items.append({
            "item_id": str(product["_id"]),
            "name": product.get("name", ""),
            "price": product.get("price", 0),
            "image": product.get("image", ""),
            "quantity": quantity,
            "available": True,
            "line_total": line_total,
        })
    return {"items": cart_items, "total": total}


def order_helper(order: dict) -> dict:
    return {
        "id": str(order["_id"]),
        "created_at": order["created_at"].isoformat(),
        "total": order["total"],
        "items": order["items"],
    }


@app.get("/cart")
def get_cart(current_user: dict = Depends(get_current_user)):
    return cart_helper(current_user["id"])


@app.post("/cart/items")
def add_cart_item(
    cart_item: CartAddModel,
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(cart_item.item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    product_id = ObjectId(cart_item.item_id)
    product = collection.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

    cart_Collection.update_one(
        {"user_id": current_user["id"]},
        {"$setOnInsert": {"items": []}},
        upsert=True,
    )
    cart = cart_Collection.find_one({"user_id": current_user["id"]})
    saved_item = next(
        (item for item in cart["items"] if item["item_id"] == product_id),
        None,
    )
    new_quantity = cart_item.quantity + (saved_item["quantity"] if saved_item else 0)
    if new_quantity > product.get("quantity", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.get('quantity', 0)} item(s) are in stock",
        )

    if saved_item:
        cart_Collection.update_one(
            {"user_id": current_user["id"], "items.item_id": product_id},
            {"$inc": {"items.$.quantity": cart_item.quantity}},
        )
    else:
        cart_Collection.update_one(
            {"user_id": current_user["id"]},
            {"$push": {"items": {"item_id": product_id, "quantity": cart_item.quantity}}},
        )
    return cart_helper(current_user["id"])


@app.put("/cart/items/{item_id}")
def update_cart_item(
    item_id: str,
    update: CartUpdateModel,
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    product_id = ObjectId(item_id)
    product = collection.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")
    if update.quantity > product.get("quantity", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.get('quantity', 0)} item(s) are in stock",
        )

    result = cart_Collection.update_one(
        {"user_id": current_user["id"], "items.item_id": product_id},
        {"$set": {"items.$.quantity": update.quantity}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    return cart_helper(current_user["id"])


@app.delete("/cart/items/{item_id}")
def remove_cart_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    cart_Collection.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"items": {"item_id": ObjectId(item_id)}}},
    )
    return cart_helper(current_user["id"])


def create_purchase(
    user_id: ObjectId,
    username: str,
    requested_items: list,
) -> dict:
    if not requested_items:
        raise HTTPException(status_code=400, detail="There are no items to purchase")

    quantities = {}
    for requested_item in requested_items:
        if not ObjectId.is_valid(requested_item.item_id):
            raise HTTPException(status_code=400, detail="Invalid item ID format")
        product_id = ObjectId(requested_item.item_id)
        quantities[product_id] = quantities.get(product_id, 0) + requested_item.quantity_to_buy

    products = {}
    for product_id, quantity in quantities.items():
        product = collection.find_one({"_id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="An item in the cart no longer exists")
        if product.get("quantity", 0) < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product.get('name', 'an item')}",
            )
        products[product_id] = product

    reserved = []
    order_id = ObjectId()
    purchased_at = datetime.utcnow()
    try:
        order_items = []
        total = 0.0
        for product_id, quantity in quantities.items():
            product = products[product_id]
            price = float(product.get("price", 0))
            result = collection.update_one(
                {"_id": product_id, "quantity": {"$gte": quantity}},
                {
                    "$inc": {"quantity": -quantity},
                    "$push": {
                        "purchases": {
                            "client_id": user_id,
                            "client_username": username,
                            "order_id": order_id,
                            "quantity": quantity,
                            "unit_price": price,
                            "total": price * quantity,
                            "purchased_at": purchased_at,
                        }
                    },
                },
            )
            if result.modified_count != 1:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {product.get('name', 'an item')}",
                )
            reserved.append((product_id, quantity))

            line_total = price * quantity
            total += line_total
            order_items.append({
                "item_id": str(product_id),
                "name": product.get("name", ""),
                "image": product.get("image", ""),
                "price": price,
                "quantity": quantity,
                "line_total": line_total,
            })

        order = {
            "_id": order_id,
            "user_id": user_id,
            "username": username,
            "items": order_items,
            "total": total,
            "created_at": purchased_at,
        }
        order_Collection.insert_one(order)
    except Exception:
        for product_id, quantity in reserved:
            collection.update_one(
                {"_id": product_id},
                {
                    "$inc": {"quantity": quantity},
                    "$pull": {"purchases": {"order_id": order_id}},
                },
            )
        raise

    return order_helper(order)


@app.post("/checkout")
def checkout(current_user: dict = Depends(get_current_user)):
    cart = cart_Collection.find_one({"user_id": current_user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty")

    requested_items = [
        CartItemModel(
            item_id=str(item["item_id"]),
            quantity_to_buy=item["quantity"],
        )
        for item in cart["items"]
    ]
    order = create_purchase(
        current_user["id"],
        current_user["username"],
        requested_items,
    )
    cart_Collection.delete_one({"_id": cart["_id"]})
    return {"message": "Purchase successful", "order": order}


@app.get("/orders")
def get_orders(current_user: dict = Depends(get_current_user)):
    orders = order_Collection.find({"user_id": current_user["id"]}).sort("created_at", -1)
    return [order_helper(order) for order in orders]

# @app.post("/items/{id}/buy", response_description="Purchase an item and reduce stock")
# def buy_item(id: str, purchase_quantity: int = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
#     if not ObjectId.is_valid(id):
#         raise HTTPException(status_code=400, detail="Invalid ID format")

#     item = collection.find_one({"_id": ObjectId(id)})  
#     if not item:
#         raise HTTPException(status_code=404, detail="Item not found")
    
#     current_stock = item.get("quantity", 0)
#     item_price = item.get("price", 0.0)              

#     if current_stock < purchase_quantity:
#         raise HTTPException(
#             status_code=400, 
#             detail=f"Not enough stock available. Only {current_stock} left."
#         )
    
#     new_quantity = current_stock - purchase_quantity
#     in_stock_status = True if new_quantity > 0 else False

#     collection.update_one(
#         {"_id": ObjectId(id)},
#         {"$set": {"quantity": new_quantity, "in_stock": in_stock_status}}
#     )

#     updated_item = collection.find_one({"_id": ObjectId(id)})
#     total_cost = purchase_quantity * item_price  
    
#     return {
#         "status": "success",
#         "message": f"Purchase successful by {current_user['username']}!",
#         "item_name": updated_item.get("name"),
#         "purchased_quantity": purchase_quantity,
#         "total_cost": total_cost,
#         "remaining_stock": new_quantity,
#         "in_stock": in_stock_status
#     }

@app.post("/mulbuy")
def buy_multiple_items(order: BulkBuyModel, current_user: dict = Depends(get_current_user)):
    purchased_order = create_purchase(
        current_user["id"],
        current_user["username"],
        order.items,
    )
    return {"message": "Purchase successful", "order": purchased_order}



             
             
