#  Welcome everyone !

`$ echo "I'm Arpy"  >>  README.md`
<hr>

<img width="45" height="45" alt="git" src="https://github.com/user-attachments/assets/94f3df09-5cc9-4f02-9a77-90af083cd8e2"/> 
<img width="150" height="150" alt="html,css,javascript" src="https://github.com/user-attachments/assets/0b2cb0e8-dd9b-4716-9061-00e5d3a88f67"/>
<img width="45" height="45" alt="python" src="https://github.com/user-attachments/assets/c2b23297-b388-4d96-838b-05166b94ed5d"/> 
<img width="50" height="50" alt="java" src="https://github.com/user-attachments/assets/44715c25-4283-4cfd-a4a3-25cb1b443f42"/>  
<img width="50" height="50" alt="Windows" src="https://github.com/user-attachments/assets/40806087-e14a-4548-ad62-d5563a358eed"/> 
<img width="50" height="50" alt="Linux" src="https://github.com/user-attachments/assets/2dbd815d-f88a-495a-bd9d-5fe89444e95a"/> 

<hr>

```java
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@Slf4j
class ProfileTest {

	@Test
	void runFullStackInfo() {
		String role = "Full-Stack Developer";
		List<String> frontend = List.of("HTML", "CSS", "JavaScript");
		List<String> backend = List.of("Java", "SQL", "JSON");
		String systems = "Windows & Linux";
		
		Profile profile = new Profile(role, frontend, backend, systems);
		
		log.info(role);
		log.info(frontend.toString());
		log.info(backend.toString());
		log.info(systems);
		
		assertEquals(role, profile.getRole());
		assertEquals(frontend, profile.getFrontendSkills());
		assertEquals(backend, profile.getBackendSkills());
		assertEquals(systems, profile.getSystems());
	}
}
```









