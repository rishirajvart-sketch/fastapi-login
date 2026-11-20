
def individual_data(todo):
    return{
         title:str(todo["id"]),
         discription:todo["name"],
         is_completed:todo["discription"],
         is_deleted:todo["discription"]
    }

def all_tasks(todos):
    return[individual_data(todo) for todo in todos]